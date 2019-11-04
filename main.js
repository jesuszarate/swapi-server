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
      results = results.concat(response.results);

      console.log(results.length + " results so far");

      if (response.next) {
        console.log("There is more.");
        return swapi.getListRequest(response.next, results);
      }
      return results;
    });
  },
  getResidents: function(planets) {
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
  let a1 = parseInt(a.mass.replace(/,/g, ""));
  let b1 = parseInt(b.mass.replace(/,/g, ""));

  if (isNaN(a1)) {
    return 1 - isNaN(b1);
  } else {
    return a1 - b1;
  }
}

app.get("/people", async (request, response) => {
  swapi
    .getListRequest(HOST + PEOPLE_PATH)
    .then(people => {
      switch (request.query.sortBy) {
        case "name":
          console.log("Lets sort by name!");
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
      let planets = p.map(planet => {
        let res = planet.residents;
        planet.residents_urls = res;
        planet.residents = [];
        return planet;
      });

      let res = swapi.getResidents(planets);

      let flatPromises = [].concat.apply([], res);
      Promise.all(flatPromises).then(() => {
        planets.forEach(planet => {
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
