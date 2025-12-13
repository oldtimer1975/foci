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

## Okosfoci API Server

The project includes a backend API server for generating football match tips based on odds data from external APIs.

### Starting the API Server

```bash
cd api
npm install
npm start
```

The server will start on `http://0.0.0.0:8081` by default.

### Environment Variables

- `PORT` - Server port (default: 8081)
- `FOOTBALL_API_KEY` - API key for football-api.sports.io (default: uses embedded key)
- `DATA_ROOT` - Path to local football data files (default: /home/kali/Downloads/meccsek)

Example:
```bash
export FOOTBALL_API_KEY=your_api_key_here
export PORT=3000
npm start
```

### API Endpoints

#### GET /windows
Returns available time windows for filtering matches.

**Response:**
```json
{
  "ok": true,
  "windows": [
    { "label": "0-8", "value": "0-8", "description": "0-8 óra" },
    { "label": "8-16", "value": "8-16", "description": "8-16 óra" },
    { "label": "16-24", "value": "16-24", "description": "16-24 óra" },
    { "label": "all", "value": "all", "description": "Egész nap" }
  ]
}
```

**Example:**
```bash
curl http://localhost:8081/windows
```

#### GET /limits
Returns available match count limits.

**Response:**
```json
{
  "ok": true,
  "limits": [3, 6, 8, 10]
}
```

**Example:**
```bash
curl http://localhost:8081/limits
```

#### GET /tippek
Generates football tips based on date, time window, and match count limit.

**Query Parameters:**
- `date` (optional) - Match date in YYYY-MM-DD format (default: today)
- `timeWindow` (optional) - Time window: `all`, `0-8`, `8-16`, or `16-24` (default: all)
- `limit` (optional) - Number of matches: 3, 6, 8, or 10 (default: 6)

**Success Response:**
```json
{
  "ok": true,
  "date": "2024-12-13",
  "timeWindow": "all",
  "limit": 6,
  "count": 6,
  "tips": [
    {
      "fixtureId": 12345,
      "league": {
        "name": "Premier League",
        "country": "England",
        "id": 39
      },
      "fixture": {
        "date": "2024-12-13T15:00:00+00:00",
        "venue": "Old Trafford",
        "status": "Not Started"
      },
      "teams": {
        "home": "Manchester United",
        "away": "Liverpool"
      },
      "timeWindow": "8-16",
      "tip": "Home",
      "tippText": "Home",
      "odds": {
        "home": 2.10,
        "draw": 3.40,
        "away": 3.20
      },
      "betType": "Match Winner"
    }
  ]
}
```

**Error Response (Invalid Parameters):**
```json
{
  "ok": false,
  "error": "Invalid time window",
  "message": "Time window must be one of: all, 0-8, 8-16, 16-24"
}
```

**Error Response (API Not Configured):**
```json
{
  "ok": false,
  "error": "API not configured",
  "message": "Football API key is missing. Please set FOOTBALL_API_KEY environment variable."
}
```

**Examples:**
```bash
# Get tips for today, all time windows, 6 matches
curl http://localhost:8081/tippek

# Get tips for specific date and time window
curl "http://localhost:8081/tippek?date=2024-12-15&timeWindow=16-24&limit=3"

# Get tips for morning matches
curl "http://localhost:8081/tippek?timeWindow=0-8&limit=10"
```

#### GET /status
Returns server status and configuration information.

**Response:**
```json
{
  "ok": true,
  "status": "running",
  "version": "1.0.0",
  "timestamp": "2024-12-13T15:30:00.000Z",
  "config": {
    "apiKeyPresent": true,
    "leaguesCount": 8,
    "timeWindowsCount": 3,
    "dataRoot": "/home/kali/Downloads/meccsek",
    "dataRootExists": false
  },
  "endpoints": [
    "GET /windows",
    "GET /limits",
    "GET /tippek",
    "GET /status",
    "GET /files",
    "GET /browse"
  ]
}
```

**Example:**
```bash
curl http://localhost:8081/status
```

#### GET /files
Lists all available football data files.

**Example:**
```bash
curl http://localhost:8081/files
```

#### GET /browse
Browse football data files with filtering and pagination.

**Query Parameters:**
- `file` (required) - File path (relative or absolute)
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Results per page (default: 10)
- `window` (optional) - Time window filter
- `league` (optional) - League name filter

**Example:**
```bash
curl "http://localhost:8081/browse?file=europe/england/2024-25_pl.json&limit=5"
```

### APK User Flow

The API supports the following user flow for mobile APK:

1. **Get available time windows**: Call `GET /windows`
2. **User selects a time window**: e.g., "8-16"
3. **Get available limits**: Call `GET /limits`
4. **User selects match count**: e.g., 6
5. **Get tips**: Call `GET /tippek?date=2024-12-13&timeWindow=8-16&limit=6`

### Error Handling

All endpoints return JSON responses. No HTML error pages are returned under any circumstances.

**Common Error Response Format:**
```json
{
  "ok": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (endpoint doesn't exist)
- `500` - Internal Server Error

### Troubleshooting

#### "Cannot GET /tippek" Error
- **Cause**: Server not running or endpoint not registered
- **Solution**: Make sure you're running the latest version of server.js and restart the server

#### 404 Not Found for all endpoints
- **Cause**: Wrong port or server not started
- **Solution**: Check that server is running on the correct port (default 8081)

#### "API not configured" error
- **Cause**: Missing or invalid API key
- **Solution**: Set `FOOTBALL_API_KEY` environment variable with a valid API key from https://www.api-football.com/

#### No tips returned (empty array)
- **Cause**: No matches on the specified date/time window, or API rate limiting
- **Solution**: 
  - Try a different date (e.g., next weekend)
  - Try "all" time window instead of specific hours
  - Check API key quota at https://www.api-football.com/

#### Server fails to start
- **Cause**: Port already in use
- **Solution**: 
  - Use a different port: `PORT=3000 npm start`
  - Or kill the process using the port: `lsof -ti:8081 | xargs kill`

#### Connection refused from mobile app
- **Cause**: Firewall blocking connections or wrong host
- **Solution**:
  - Server binds to `0.0.0.0` to accept connections from any interface
  - Check firewall settings
  - Use the correct IP address of the server machine (not localhost)

### Algorithm Details

The tip generation algorithm:

1. **Fetches fixtures** from major European leagues (Premier League, La Liga, Bundesliga, Serie A, etc.)
2. **Fetches odds** from bookmakers for each fixture
3. **Analyzes multiple bet types**:
   - Match Winner (Home/Draw/Away)
   - Double Chance (Home or Draw, Home or Away, Draw or Away)
   - Over/Under 2.5 goals
   - Both Teams to Score (Yes/No)
4. **Selects the strongest tip** based on the lowest odds (highest probability)
5. **Returns fixture metadata** including teams, league, date, venue, and odds
6. **Handles missing data gracefully**: Returns `tip: null` if odds are unavailable

### CORS Configuration

CORS is enabled for all origins to allow the mobile APK to access the API from any domain.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# foci
