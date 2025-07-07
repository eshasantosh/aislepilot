# AislePilot

AislePilot is a smart grocery shopping assistant that helps you plan your shopping trip efficiently. It takes your grocery list, categorizes items into aisles, suggests things you might have forgotten, and generates an optimal in-store route on a map to save you time.

## Features

- **AI-Powered List Categorization**: Automatically sorts your grocery items into supermarket aisles.
- **Smart Suggestions**: Get intelligent recommendations for related items you might need.
- **Optimal Store Path**: Generates the most efficient route through the store to get all your items.
- **Interactive Store Map**: Follow a turn-by-turn guide on a map, with your next aisle highlighted.
- **Dynamic Shopping Cart**: Track your items and total cost as you shop.
- **Simulated Barcode Scanning**: Quickly add items to your cart with a barcode scanner simulation.
- **Self-Checkout Simulation**: Generate a barcode to complete your purchase at a self-checkout counter.

## Tech Stack

- **Next.js**: React framework for building the user interface.
- **TypeScript**: For type-safe code.
- **Tailwind CSS**: For styling the application.
- **ShadCN UI**: For the component library.
- **Genkit & Google Gemini**: For all generative AI features, including item categorization and suggestions.
- **Google Maps Platform APIs**: For the interactive store map and pathfinding.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root of the project. You will need to add API keys for Google Maps and Google AI.

    ```env
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
    GOOGLE_API_KEY=your_google_ai_studio_api_key
    ```

    - Get your Google Maps API key from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview).
    - Get your Google AI Studio API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Running Locally

1.  **Start the Genkit AI Server**:
    In a new terminal window, run the following command to start the Genkit development server, which powers the AI features.
    ```bash
    npm run genkit:dev
    ```

2.  **Start the Next.js App**:
    In another terminal window, run the following command to start the main application.
    ```bash
    npm run dev
    ```

3.  Open your browser and navigate to [http://localhost:9002](http://localhost:9002).
