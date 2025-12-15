# Welcome to Okosfoci 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Okosfoci API - Football Tips Generation

The `api/` directory contains a sophisticated football tips generation system that:
- Fetches fixtures and odds from API-Football (api-sports.io)
- Generates intelligent tips using configurable algorithms
- Filters by time windows and match limits
- Integrates local team database for enriched metadata
- Provides safe JSON API endpoints for mobile APK consumption

### Features

- **Time Window Filtering**: Filter matches by time ranges (0-8h, 8-16h, 16-24h, or all)
- **Strongest Tip Selection**: Automatically selects the most likely outcome (lowest odds) across multiple bet types
- **Team Database Integration**: Enriches match data with team metadata from local database
- **MAX_MATCHES Limit**: Control the number of tips generated
- **Multiple Bet Types**: Supports Match Winner, Double Chance, Over/Under 2.5, Both Teams to Score
- **APK-Safe API**: Always returns JSON, never HTML error pages
- **CORS Enabled**: Ready for cross-origin requests from mobile apps

## Setup

### Prerequisites

- Node.js 18+ recommended
- npm or yarn
- API-Football API key from [https://dashboard.api-football.com/](https://dashboard.api-football.com/)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Navigate to the API directory:
   ```bash
   cd api
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your API key:
   ```
   X_APISPORTS_KEY=your_actual_api_key_here
   ```

4. Configure leagues and settings (optional):
   ```bash
   cp config.example.json config.json
   ```
   
   Edit `config.json` to customize:
   - Leagues to query (id, season, name)
   - Bet types priority order
   - Default time window
   - Maximum matches limit

### Team Database

The system uses a local team database to enrich match outputs. Two formats are supported:

**JSON Format** (`data/teams.json`):
```json
{
  "teams": [
    {
      "name": "Arsenal",
      "country": "England",
      "league": "Premier League",
      "stadium": "Emirates Stadium",
      "founded": 1886
    }
  ]
}
```

**TXT Format** (`data/teams.txt`):
```
# Format: TeamName|Country|League|Stadium|Founded
Arsenal|England|Premier League|Emirates Stadium|1886
```

Sample databases are included. Expand them as needed.

## Usage

### Running the Algorithm Script

Generate tips using the command-line script:

```bash
cd api
node okosfoci-algoritmus.js
```

**Options:**
- `--date YYYY-MM-DD` - Date to generate tips for (default: today)
- `--timeWindow all|0-8|8-16|16-24` - Time window filter (default: all)
- `--maxMatches N` - Maximum number of matches (default: from config)

**Examples:**
```bash
# Generate tips for today
node okosfoci-algoritmus.js

# Tips for specific date
node okosfoci-algoritmus.js --date 2025-12-25

# Evening matches only, max 10
node okosfoci-algoritmus.js --date 2025-12-25 --timeWindow 16-24 --maxMatches 10
```

Output is saved to `api/tippek_OKOSFOCI.json`.

### Running the API Server

Start the Express server:

```bash
cd api
npm start
# or
node server.js
```

Server runs on `http://0.0.0.0:8081` by default (configure with `PORT` env variable).

### API Endpoints

#### GET /tippek

Generate tips on-demand with query parameters.

**Query Parameters:**
- `date` (optional): YYYY-MM-DD format (default: today)
- `timeWindow` (optional): `all`, `0-8`, `8-16`, `16-24` (default: all)
- `limit` (optional): Maximum matches, 1-100 (default: from config)

**Response:**
```json
{
  "ok": true,
  "date": "2025-12-13",
  "timeWindow": "all",
  "count": 5,
  "tips": [
    {
      "fixtureId": 12345,
      "league": "Premier League",
      "leagueId": 39,
      "date": "2025-12-13T15:00:00+00:00",
      "timestamp": 1702479600,
      "hour": 15,
      "timeWindow": "8-16",
      "home": "Arsenal",
      "away": "Chelsea",
      "home_db": {
        "name": "Arsenal",
        "country": "England",
        "league": "Premier League",
        "stadium": "Emirates Stadium",
        "founded": 1886
      },
      "away_db": {
        "name": "Chelsea",
        "country": "England",
        "league": "Premier League",
        "stadium": "Stamford Bridge",
        "founded": 1905
      },
      "venue": "Emirates Stadium",
      "status": "NS",
      "tip": "Home",
      "odds": 1.85,
      "betType": "Match Winner"
    }
  ]
}
```

**Error Response** (always JSON, never HTML):
```json
{
  "ok": false,
  "error": "Invalid date format. Use YYYY-MM-DD"
}
```

**Examples with curl:**

```bash
# Get today's tips
curl http://localhost:8081/tippek

# Tips for specific date
curl "http://localhost:8081/tippek?date=2025-12-25"

# Evening matches only
curl "http://localhost:8081/tippek?date=2025-12-25&timeWindow=16-24"

# Limit to 5 matches
curl "http://localhost:8081/tippek?date=2025-12-25&limit=5"

# Combined parameters
curl "http://localhost:8081/tippek?date=2025-12-25&timeWindow=8-16&limit=10"
```

#### GET /files

List all available match data files (TXT/JSON) in DATA_ROOT.

```bash
curl http://localhost:8081/files
```

#### GET /browse

Browse match data from TXT/JSON files with filtering and pagination.

**Query Parameters:**
- `file` (required): File path (relative or absolute)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `window` (optional): Time window filter (HH:MM-HH:MM)
- `league` (optional): League name filter

```bash
curl "http://localhost:8081/browse?file=europe/england/2024-25_premier.json&page=1&limit=20"
```

### Validating Team Database

Use the validation script to check for missing teams:

```bash
cd scripts
node validate-teams.js --date 2025-12-13
```

This will:
1. Fetch fixtures for the specified date
2. Compare team names against your local database
3. Report unmatched teams with suggested entries

Add missing teams to `data/teams.json` or `data/teams.txt` to improve data quality.

## Configuration

### config.json

```json
{
  "leagues": [
    {
      "id": 39,
      "season": 2024,
      "name": "Premier League"
    }
  ],
  "tipp_types": [
    "Match Winner",
    "Double Chance",
    "Over/Under 2.5",
    "Both Teams to Score"
  ],
  "default_time_window": "all",
  "max_matches": 20,
  "api_delay_ms": 300
}
```

**Settings:**
- `leagues`: Array of leagues to query (id from API-Football, season year, display name)
- `tipp_types`: Prioritized list of bet types (first match wins)
- `default_time_window`: Default filter when not specified
- `max_matches`: Default maximum tips to generate
- `api_delay_ms`: Delay between API calls (rate limiting)

### Time Windows

- `0-8`: Matches between 00:00-07:59 UTC
- `8-16`: Matches between 08:00-15:59 UTC
- `16-24`: Matches between 16:00-23:59 UTC
- `all`: All matches regardless of time

## Algorithm Details

### Strongest Tip Selection

The algorithm selects the "strongest" tip by:

1. Iterating through bet types in priority order (from `tipp_types` config)
2. For each bet type, finding the outcome with the **lowest odds** (most likely)
3. Selecting the first available strong tip based on priority

**Example:**
- Config: `["Match Winner", "Over/Under 2.5"]`
- If Match Winner odds exist: Home=1.85, Draw=3.50, Away=4.00 → Selects "Home @ 1.85"
- If Match Winner unavailable: Checks Over/Under 2.5 next

This ensures the most confident predictions are selected first.

### Error Handling

The API always returns JSON, ensuring mobile APKs never receive HTML error pages:

```json
{
  "ok": false,
  "error": "Error description",
  "message": "Detailed message if available"
}
```

All endpoints use try-catch with JSON error responses, making them safe for APK consumption.

## Development

### Project Structure

```
foci/
├── api/                          # Backend API
│   ├── okosfoci-algoritmus.js    # Main algorithm
│   ├── server.js                 # Express server
│   ├── config.example.json       # Configuration template
│   ├── .env.example              # Environment template
│   └── package.json
├── data/                         # Team database
│   ├── teams.json
│   └── teams.txt
├── scripts/                      # Utility scripts
│   └── validate-teams.js
├── app/                          # Expo mobile app
└── README.md
```

### Testing

Test the API manually:

```bash
# Start server
cd api
npm start

# In another terminal, test endpoints
curl http://localhost:8081/tippek
curl "http://localhost:8081/tippek?date=2025-12-25&timeWindow=16-24&limit=5"
```

## Expo App

### Get started

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

### Get a fresh project

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

## License

This project is part of the Okosfoci football tips application.

