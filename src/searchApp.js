const axios = require("axios");
const querystring = require("querystring");
const { TeamsActivityHandler, CardFactory } = require("botbuilder");
const ACData = require("adaptivecards-templating");
const rickVerso = require("./adaptiveCards/rickVerso.json");
const { url } = require("inspector");

class SearchApp extends TeamsActivityHandler {
  constructor() {
    super();
  }

  // Message extension Code
  async handleTeamsMessagingExtensionQuery(context, query) {
    // Get the search query
    const searchQuery = query.parameters[0].value.toLowerCase();
    const power_automate_url = 'https://prod-126.westeurope.logic.azure.com:443/workflows/145db6991898427caeccd191b0663178/triggers/manual/paths/invoke?api-version=2016-06-01'

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
            url: character.url
          }
        });

        // Combine Hero Card and Adaptive Card in the attachment
        return { ...CardFactory.adaptiveCard(card), preview };
      });
    
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
  async handleTeamsCardActionInvoke(context, query) {
    console.log("Invocado desde Adaptive Card", query);

    const { action } = query;
    if (action && action.type === "Action.Execute") {
      const actionData = action.data;

      console.log("Datos recibidos desde la tarjeta:", actionData);
      //crear Data con los datos del actionData
        // Datos a enviar a Power Automate
        const data = {
          name: actionData.name,
          status: actionData.status,
          gender: actionData.gender,
          species: actionData.species,
          url: actionData.url
      };

      const powerAutomateUrl = 'https://prod-126.westeurope.logic.azure.com:443/workflows/145db6991898427caeccd191b0663178/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=jtR2_8lifTZd9oeo9KEHhxHv8rUtN7SOnpJH6Zv2iNI'; // Actualiza la URL

      try {
        const response = await axios.post(powerAutomateUrl, data, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      
        console.log("Respuesta de Power Automate:", response.data);
      
        return {
          statusCode: 200,
          type: "message",
          text: `Acción ejecutada correctamente para ${actionData.name}.`,
        };
      } catch (error) {
        console.error("Error al enviar datos a Power Automate:", error.message);
        if (error.response) {
          console.error("Detalles del error:", error.response.data);
        }
        return {
          statusCode: 500,
          type: "message",
          text: "Hubo un error al procesar la solicitud.",
        };
      }}}
  // Integración del método en `onInvokeActivity`
async onInvokeActivity(context) {
  console.log("onInvokeActivity llamado.");

  if (context.activity.name === "adaptiveCard/action") {
    // Llamar al manejador de acciones de tarjeta
    return await this.handleTeamsCardActionInvoke(context, context.activity.value);
  }

  // Si no es una invocación esperada, delegar al comportamiento base
  return super.onInvokeActivity(context);
}
}

module.exports.SearchApp = SearchApp;
