const express = require("express");
const request = require("request-promise");
const app = express();

const port = 3000;
const HOST = "https://swapi.co";
const PEOPLE_PATH = "/api/people/";
const PLANETS_PATH = "/api/planets/";

var swapi = {
  getListRequest: function(uri, results) {
    console.log(uri);
    return request({
      method: "GET",
      uri: uri,
      json: true
    }).then(function(response) {
      if (!results) {
        results = [];
      }
      // Add the current results to the results we've gather so far
      results = results.concat(response.results);

      console.log(results.length + " results so far");

      // If there is more results then we recursively get the next 10 results
      if (response.next) {
        console.log("There is more.");
        return swapi.getListRequest(response.next, results);
      }
      return results;
    });
  },
  getResidents: function(planets) {
    // We collect list of list of promises and return them
    let allPromises = planets.map(planet => {
      return planet.residents_urls.map(url => {
        return request({
          method: "GET",
          uri: url,
          json: true
        }).then(function(response) {
          planet.residents.push(response.name);
        });
      });
    });
    return allPromises;
  }
};

function integerComparator(a, b) {
  // Remove comma from string number and then parse
  let a1 = parseInt(a.mass.replace(/,/g, ""));
  let b1 = parseInt(b.mass.replace(/,/g, ""));

  // A lot of people have an 'unknown' mass so this handles that
  if (isNaN(a1)) {
    return 1 - isNaN(b1);
  } else {
    return a1 - b1;
  }
}

app.get("/", async (request, response) => {
  response.send(
    "<h1>Welcome</h1>" +
      "<h3> Available endpoints </h3>" +
      "<ul>" +
      "<li> " +
      "GET: <a href='/people'> /people </a> " +
      "<ul>" +
      "<li> <b> Sort by </b>: name, height or mass </li>" +
      "<li> <b> Example </b>: /people/?sortBy=height </li>" +
      "</ul>" +
      "</li>" +
      "GET: <a href='/planets'> /planets </a> " +
      "</ul>"
  );
});

app.get("/people", async (request, response) => {
  swapi
    .getListRequest(HOST + PEOPLE_PATH)
    .then(people => {
      switch (request.query.sortBy) {
        case "name":
          console.log("By name!");
          people.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
          });
          break;
        case "height":
          console.log("By Height!");
          people.sort(integerComparator);
          break;
        case "mass":
          people.sort(integerComparator);
          console.log("By mass!");
          break;
        default:
          console.log("No valid field to sort by.");
      }
      response.send(JSON.stringify(people));
    })
    .catch(e => {
      console.error(e);
      response.status(500).send("Something went wrong!");
    });
});

app.get("/planets", async (_, response) => {
  swapi
    .getListRequest(HOST + PLANETS_PATH)
    .then(p => {
      // Save the resident urls elsewhere so
      // that we can store the names in residents field
      let planets = p.map(planet => {
        let res = planet.residents;
        planet.residents_urls = res;
        planet.residents = [];
        return planet;
      });

      // These are the promises of the residents it's a list of list of promises
      let promiseResults = swapi.getResidents(planets);

      // Flatten out the promises into a single list
      let flatPromises = [].concat.apply([], promiseResults);

      // Wait for all the promises to finish
      Promise.all(flatPromises).then(() => {
        planets.forEach(planet => {
          // We don't need residents_urls so we remove this field
          delete planet.residents_urls;
        });
        response.send(JSON.stringify(planets));
      });
    })
    .catch(e => {
      console.error(e);
      response.status(500).send("Something went wrong!");
    });
});

app.listen(port, err => {
  if (err) {
    return console.log("something bad happened", err);
  }
  console.log(`server is listening on ${port}`);
});
