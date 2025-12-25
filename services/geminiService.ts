
import { GoogleGenAI, Type } from "@google/genai";
import { SearchCriteria, Flight } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY do Google GenAI não encontrada. Verifique as variáveis de ambiente.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const flightSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Identificador único do voo (formato UUID)" },
    airline: { type: Type.STRING, description: "Nome da companhia aérea (ex: Ryanair, TAP Air Portugal, easyJet, Iberia)" },
    flightNumber: { type: Type.STRING, description: "Número do voo" },
    departure: {
      type: Type.OBJECT,
      properties: {
        time: { type: Type.STRING, description: "Horário de partida (HH:MM)" },
        airport: { type: Type.STRING, description: "Nome do aeroporto de partida" },
        airportCode: { type: Type.STRING, description: "Código IATA do aeroporto de partida" },
      },
      required: ["time", "airport", "airportCode"],
    },
    arrival: {
      type: Type.OBJECT,
      properties: {
        time: { type: Type.STRING, description: "Horário de chegada (HH:MM)" },
        airport: { type: Type.STRING, description: "Nome do aeroporto de chegada" },
        airportCode: { type: Type.STRING, description: "Código IATA do aeroporto de chegada" },
      },
       required: ["time", "airport", "airportCode"],
    },
    duration: { type: Type.STRING, description: "Duração total do voo (ex: 8h 30m)" },
    stops: { type: Type.INTEGER, description: "Número de paradas" },
    price: { type: Type.NUMBER, description: "Preço da passagem por adulto em BRL" },
  },
  required: ["id", "airline", "flightNumber", "departure", "arrival", "duration", "stops", "price"],
};

export const findFlights = async (criteria: SearchCriteria): Promise<Flight[]> => {
  const prompt = `
    Gere uma lista de 8 a 12 voos fictícios para uma viagem de ida e volta de ${criteria.origin} para ${criteria.destination}.
    A partida é em ${criteria.departureDate} e o retorno em ${criteria.returnDate}.
    A busca é para ${criteria.passengers} passageiro(s) em classe ${criteria.flightClass}.
    ${criteria.directFlightsOnly ? 'Inclua apenas voos diretos.' : 'Inclua voos com e sem escalas.'}
    Use uma variedade de companhias aéreas conhecidas na Europa como Ryanair, TAP Air Portugal, easyJet, Iberia, Air Europa, e Vueling.
    Varie as durações, paradas e preços. O preço deve ser por passageiro.
    Para cada item da lista, gere os dados de um voo de ida. A UI irá assumir que a volta tem características similares.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flights: {
              type: Type.ARRAY,
              items: flightSchema,
            },
          },
          required: ["flights"],
        },
      },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    if (parsed && Array.isArray(parsed.flights)) {
        return parsed.flights;
    }

    console.warn("A resposta da API não continha um array de voos:", parsed);
    return [];

  } catch (error) {
    console.error("Erro ao chamar a API Gemini:", error);
    throw new Error("Não foi possível obter os dados dos voos.");
  }
};
