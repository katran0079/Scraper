var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

var request = require("request");
var cheerio = require("cheerio");

var MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);

var db = mongoose.connection;

var PORT = process.env.PORT || 3000;

var app = express();

app.use(logger("dev"));
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

app.use(express.static("public"));

var exphbs = require("express-handlebars");
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
  })
);
app.set("view engine", "handlebars");

db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

db.once("open", function() {
  console.log("Mongoose connection successful.");
});

app.get("/", function(req, res) {
  Article.find({ saved: false })
    .limit(20)
    .exec(function(error, data) {
      var hbsObject = {
        article: data
      };
      console.log(hbsObject);
      res.render("home", hbsObject);
    });
});

app.get("/saved", function(req, res) {
  Article.find({ saved: true })
    .populate("notes")
    .exec(function(error, articles) {
      var hbsObject = {
        article: articles
      };
      res.render("saved", hbsObject);
    });
});

app.get("/scrape", function(req, res) {
  request("https://www.independent.co.uk/topic/Dinosaurs", function(
    error,
    response,
    html
  ) {
    var $ = cheerio.load(html);
    // Now, we grab every h2 within an article tag, and do the following:
    $(".article").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .find(".headline")
        .text();
      result.summary = $(this)
        .children("p")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");
      var entry = new Article(result);

      entry.save(function(err, doc) {
        if (err) {
          console.log(err);
        } else {
          console.log(doc);
        }
      });
    });
    res.send("Scrape Complete");
  });
});

app.get("/articles", function(req, res) {
  Article.find({})
    .limit(20)
    .exec(function(error, doc) {
      if (error) {
        console.log(error);
      } else {
        res.json(doc);
      }
    });
});

app.get("/articles/:id", function(req, res) {
  Article.findOne({ _id: req.params.id })
    .populate("note")
    .exec(function(error, doc) {
      if (error) {
        console.log(error);
      } else {
        res.json(doc);
      }
    });
});

app.post("/articles/save/:id", function(req, res) {
  Article.findOneAndUpdate({ _id: req.params.id }, { saved: true }).exec(
    function(err, doc) {
      if (err) {
        console.log(err);
      } else {
        res.send(doc);
      }
    }
  );
});

app.post("/articles/delete/:id", function(req, res) {
  Article.findOneAndUpdate(
    { _id: req.params.id },
    { saved: false, notes: [] }
  ).exec(function(err, doc) {
    if (err) {
      console.log(err);
    } else {
      res.send(doc);
    }
  });
});

app.post("/notes/save/:id", function(req, res) {
  var newNote = new Note({
    body: req.body.text,
    article: req.params.id
  });
  console.log(req.body);
  newNote.save(function(error, note) {
    if (error) {
      console.log(error);
    } else {
      Article.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { notes: note } }
      ).exec(function(err) {
        if (err) {
          console.log(err);
          res.send(err);
        } else {
          res.send(note);
        }
      });
    }
  });
});

app.delete("/notes/delete/:note_id/:article", function(req, res) {
  Note.findOneAndRemove({ _id: req.params.note_id }, function(err) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      Article.findOneAndUpdate(
        { _id: req.params.article_id },
        { $pull: { notes: req.params.note_id } }
      ).exec(function(err) {
        if (err) {
          console.log(err);
          res.send(err);
        } else {
          res.send("Note Deleted");
        }
      });
    }
  });
});

app.listen(PORT, function() {
  console.log("App running on PORT: " + PORT);
});
