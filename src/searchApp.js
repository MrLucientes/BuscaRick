const axios = require("axios");
const querystring = require("querystring");
const { TeamsActivityHandler, CardFactory } = require("botbuilder");
const ACData = require("adaptivecards-templating");
const rickVerso = require("./adaptiveCards/rickVerso.json");
const aLaEspera = require("./adaptiveCards/aLaEspera.json");
//const rickspuesta = require("./adaptiveCards/rickspuesta.json");

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
        // ------La hora para la tarjeta de respuesta---
        const currentDate = new Date().toLocaleDateString();

        // Create an Adaptive Card based on the template
        const template = new ACData.Template(rickVerso); // Convierte la tarjeta en un objeto adjunto que se puede enviar
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
    const currentDate = new Date().toLocaleString(); 
    const chatId = context.activity.conversation.id;
    const pushName = context.activity.from.name;
    //const messageId = context.activity.Id;
    console.log("****ID****:", context.activity);
    const { action } = query;
    if (action && action.type === "Action.Execute") {
        const actionData = action.data;

        // Datos a enviar a Power Automate
        const data = {
            id: actionData.id,
            name: actionData.name,
            status: actionData.status,
            gender: actionData.gender,
            species: actionData.species,
            url: actionData.url,
            currentDate: currentDate,
            chatId: chatId,
            pushName:pushName 
            
        };
        console.log("DATA: ",data)
        const powerAutomateUrl = 'https://prod-126.westeurope.logic.azure.com:443/workflows/145db6991898427caeccd191b0663178/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=jtR2_8lifTZd9oeo9KEHhxHv8rUtN7SOnpJH6Zv2iNI';

        try {
            // Enviar datos a Power Automate
            const response = await axios.post(powerAutomateUrl, data, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Crear y devolver la tarjeta adaptativa
            return this.createAndSendAdaptiveCard(context, data);
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
        }
    }
}

// Método para crear y enviar la tarjeta adaptativa
async createAndSendAdaptiveCard(context, data) {
    const template = new ACData.Template(aLaEspera);
    const newcard = template.expand({
        $root: data
    });

    const newadaptiveCard = CardFactory.adaptiveCard(newcard);

    // Enviar la tarjeta como respuesta
    await context.sendActivity({ attachments: [newadaptiveCard] });

    return {
        statusCode: 200,
        type: "message",
        text: `Acción ejecutada correctamente para ${data.name}.`,
    };
}

// Integración del método en `onInvokeActivity`
async onInvokeActivity(context) {
    console.log("onInvokeActivity llamado.");

    if (context.activity.name === "adaptiveCard/action") {
        return await this.handleTeamsCardActionInvoke(context, context.activity.value);
    }

    // Si no es una invocación esperada, delegar al comportamiento base
    return super.onInvokeActivity(context);
}
}

module.exports.SearchApp = SearchApp;
