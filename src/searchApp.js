const axios = require("axios");
const querystring = require("querystring");
const { TeamsActivityHandler, CardFactory } = require("botbuilder");
const ACData = require("adaptivecards-templating");
const rickVerso = require("./adaptiveCards/rickVerso.json");

class SearchApp extends TeamsActivityHandler {
  constructor() {
    super();
  }

  // Message extension Code
  async handleTeamsMessagingExtensionQuery(context, query) {
    // Get the search query
    const searchQuery = query.parameters[0].value.toLowerCase();

    try {
      // Execute search logic
      const response = await axios.get(
        `https://rickandmortyapi.com/api/character/?${querystring.stringify({
          name: searchQuery,
        })}`
      );

      // Limit results to 8
      const results = response.data.results.slice(0, 8);

      if (!results.length) {
        throw new Error("No se encontraron personajes con ese nombre.");
      }

      // Generate attachments for each result
      const attachments = results.map((character) => {
        // Create a Hero Card for the preview
        const preview = CardFactory.heroCard(
          character.name.toUpperCase(),
          `Status: ${character.status} | Gender: ${character.gender}`,
          [`https://rickandmortyapi.com/api/character/avatar/${character.id}.jpeg`]
        );

        // Create an Adaptive Card based on the template
        const template = new ACData.Template(rickVerso);
        const card = template.expand({
          $root: {
            id: character.id,
            name: character.name,
            status: character.status,
            gender: character.gender,
            species: character.species,
          },
        });

        // Combine Hero Card and Adaptive Card in the attachment
        return { ...CardFactory.adaptiveCard(card), preview };
      });
      const tarjeta=  data = {
          id: character.id,
            name: character.name,
            status: character.status,
            gender: character.gender,
            species: character.species,
        }
      // Return the results using the attachments
      return {
        composeExtension: {
          type: "result",
          attachmentLayout: "list", // You can also use 'grid' for a grid layout
          attachments: attachments,
        },
      };
    } catch (error) {
      console.error("Error fetching characters:", error.message);

      return {
        composeExtension: {
          type: "message",
          text: "Hubo un error al realizar la búsqueda. Por favor, inténtalo de nuevo.",
        },
      };
    }
  }
}

module.exports.SearchApp = SearchApp;
