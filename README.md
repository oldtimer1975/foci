# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

---

# Okosfoci API - Football Tips Generator

This repository includes an intelligent football tips generation system that fetches data from API-Football and generates betting tips using a configurable algorithm.

## Features

- 🎯 **Intelligent Algorithm**: Selects the strongest (most likely) tips based on lowest odds across multiple bet types
- ⏰ **Time-Window Filtering**: Filter matches by time windows (0-8h, 8-16h, 16-24h, or all)
- 🔢 **Match Limiting**: Configure maximum number of matches to analyze
- 🏆 **Multi-League Support**: Fetch data from multiple leagues simultaneously
- 📊 **Multiple Bet Types**: Support for Match Winner, Double Chance, Over/Under 2.5, Both Teams to Score
- 📚 **Team Database Integration**: Enriches tips with team metadata from local database
- 🌐 **REST API**: Express.js server with JSON-only responses (APK-safe, no HTML errors)
- ✅ **CORS Enabled**: Safe for mobile APK consumption

## Requirements

- **Node.js**: v18.x or v20.x (tested with v20.19.6)
- **npm**: v8.x or higher
- **API-Football Key**: Get your free API key from [API-Football Dashboard](https://dashboard.api-football.com/)

## Setup

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Configure API Key

Create a `.env` file in the `api` directory:

```bash
cd api
cp .env.example .env
```

Edit `.env` and add your API-Football key:

```env
X_APISPORTS_KEY=your_actual_api_key_here
PORT=8081
```

### 3. Configure Leagues and Settings

Create `config.json` from the example:

```bash
cd api
cp config.example.json config.json
```

Edit `config.json` to customize:

- **leagues**: List of leagues to query (id, name, season)
- **tippTypes**: Prioritized bet types for tip selection
- **defaultTimeWindow**: Default time filter (all, 0-8, 8-16, 16-24)
- **maxMatches**: Maximum number of matches to process

Example `config.json`:

```json
{
  "leagues": [
    { "id": 39, "name": "Premier League", "season": 2024 },
    { "id": 140, "name": "La Liga", "season": 2024 }
  ],
  "tippTypes": [
    "Match Winner",
    "Double Chance",
    "Over/Under 2.5",
    "Both Teams to Score"
  ],
  "defaultTimeWindow": "all",
  "maxMatches": 20,
  "apiBaseUrl": "https://v3.football.api-sports.io"
}
```

### 4. Team Database (Optional)

The system comes with a sample team database in `data/teams.json`. You can expand it with more teams:

```json
{
  "teams": [
    {
      "name": "Arsenal",
      "country": "England",
      "league": "Premier League",
      "founded": 1886,
      "venue": "Emirates Stadium",
      "capacity": 60260
    }
  ]
}
```

## Usage

### Running the Algorithm Script

Generate tips directly to a JSON file:

```bash
cd api
node okosfoci-algoritmus.js
```

With custom parameters:

```bash
node okosfoci-algoritmus.js --date 2024-12-15 --timeWindow 16-24 --maxMatches 10
```

This creates `tippek_OKOSFOCI.json` with the generated tips.

### Running the API Server

Start the Express server:

```bash
cd api
npm start
```

The server runs on `http://localhost:8081` (or the PORT specified in `.env`).

### API Endpoints

#### Health Check

```bash
curl http://localhost:8081/health
```

Response:
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2024-12-13T10:30:00.000Z",
  "service": "okosfoci-api"
}
```

#### Get Tips

```bash
curl "http://localhost:8081/tippek?date=2024-12-13&timeWindow=all&limit=10"
```

**Query Parameters:**
- `date` (optional): Date in YYYY-MM-DD format (default: today)
- `timeWindow` (optional): `all`, `0-8`, `8-16`, or `16-24` (default: `all`)
- `limit` (optional): Max number of matches, 1-100 (default: 20)

**Success Response:**
```json
{
  "ok": true,
  "date": "2024-12-13",
  "timeWindow": "all",
  "count": 5,
  "tips": [
    {
      "fixtureId": 1234567,
      "league": "Premier League",
      "date": "2024-12-13T20:00:00+00:00",
      "timeWindow": "16-24",
      "home": "Arsenal",
      "away": "Chelsea",
      "venue": "Emirates Stadium",
      "tip": "Home",
      "odds": 1.85,
      "betType": "Match Winner",
      "home_db": {
        "name": "Arsenal",
        "country": "England",
        "league": "Premier League",
        "founded": 1886,
        "venue": "Emirates Stadium",
        "capacity": 60260
      },
      "away_db": {
        "name": "Chelsea",
        "country": "England",
        "league": "Premier League",
        "founded": 1905,
        "venue": "Stamford Bridge",
        "capacity": 40834
      }
    }
  ]
}
```

**Error Response (always JSON, never HTML):**
```json
{
  "ok": false,
  "error": "Invalid date format. Use YYYY-MM-DD",
  "date": "invalid-date"
}
```

### Validating Team Database

Check which teams from fixtures are missing from your database:

```bash
cd api
npm run validate-teams
```

Or with a specific date:

```bash
node ../scripts/validate-teams.js --date 2024-12-15
```

This tool will:
1. Fetch fixtures from configured leagues
2. Compare team names against your database
3. Report missing teams
4. Generate JSON template for easy addition

## Error Handling

The API is designed for mobile APK consumption and **always returns JSON**, never HTML error pages:

- **400 Bad Request**: Invalid parameters (date format, time window, limit)
- **404 Not Found**: Invalid endpoint
- **500 Internal Server Error**: API failures, network issues

All errors include:
```json
{
  "ok": false,
  "error": "Error description",
  "timestamp": "2024-12-13T10:30:00.000Z"
}
```

## Sample Output

Example `tippek_OKOSFOCI.json`:

```json
[
  {
    "fixtureId": 1035198,
    "league": "Premier League",
    "date": "2024-12-13T20:00:00+00:00",
    "timeWindow": "16-24",
    "home": "Liverpool",
    "away": "Manchester City",
    "venue": "Anfield",
    "tip": "Home",
    "odds": 2.10,
    "betType": "Match Winner",
    "home_db": {
      "name": "Liverpool",
      "country": "England",
      "league": "Premier League",
      "founded": 1892,
      "venue": "Anfield",
      "capacity": 53394
    },
    "away_db": {
      "name": "Manchester City",
      "country": "England",
      "league": "Premier League",
      "founded": 1880,
      "venue": "Etihad Stadium",
      "capacity": 53400
    }
  }
]
```

## Development

### Project Structure

```
foci/
├── api/
│   ├── okosfoci-algoritmus.js    # Main algorithm implementation
│   ├── server-new.js              # Express API server
│   ├── config.json                # Configuration (create from .example)
│   ├── .env                       # Environment variables (create from .example)
│   └── package.json               # Node.js dependencies
├── data/
│   ├── teams.json                 # Team database (JSON format)
│   └── teams.txt                  # Team database (text format)
├── scripts/
│   └── validate-teams.js          # Team validation utility
└── README.md                      # This file
```

### Testing Locally

1. **Start the server:**
   ```bash
   cd api && npm start
   ```

2. **Test health endpoint:**
   ```bash
   curl http://localhost:8081/health
   ```

3. **Test tips endpoint:**
   ```bash
   curl "http://localhost:8081/tippek?date=2024-12-13&timeWindow=all&limit=5"
   ```

4. **Test error handling:**
   ```bash
   curl "http://localhost:8081/tippek?date=invalid"
   # Should return JSON error, not HTML
   ```

### Algorithm Logic

The **strongest tip selection** works as follows:

1. For each match, fetch odds from API-Football
2. Check each configured bet type in priority order:
   - Match Winner
   - Double Chance
   - Over/Under 2.5
   - Both Teams to Score
3. Find the outcome with the **lowest odds** (highest probability)
4. Return that outcome as the tip

Lower odds = higher probability = stronger tip.

## Troubleshooting

### Empty Results

If you get no tips:
- Check that fixtures exist for the selected date
- Verify your API key is valid and has quota remaining
- Check the league IDs and seasons in `config.json`
- Try a different date or time window

### API Key Issues

- Get your key from: https://dashboard.api-football.com/
- Free tier has limited requests (100/day)
- Ensure `.env` file is in the `api` directory

### Team Database

- Teams not found in database will have `null` for `home_db`/`away_db`
- Run `npm run validate-teams` to identify missing teams
- Add missing teams to `data/teams.json`

## License

ISC

# foci
