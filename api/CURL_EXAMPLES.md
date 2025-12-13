# Okosfoci API - cURL Examples

Quick reference for testing the API endpoints.

## Prerequisites

```bash
# Start the server
cd api
npm start
```

Server runs on `http://localhost:8081` by default.

## Basic Endpoints

### Health Check
```bash
curl http://localhost:8081/health
```

### API Documentation
```bash
curl http://localhost:8081/
```

## Tips Endpoint Examples

### Get Today's Tips (All Time Windows)
```bash
curl "http://localhost:8081/tippek"
```

### Get Tips for Specific Date
```bash
curl "http://localhost:8081/tippek?date=2024-12-15"
```

### Get Tips with Time Window Filter

**Morning matches (0-8h):**
```bash
curl "http://localhost:8081/tippek?date=2024-12-15&timeWindow=0-8"
```

**Afternoon matches (8-16h):**
```bash
curl "http://localhost:8081/tippek?date=2024-12-15&timeWindow=8-16"
```

**Evening matches (16-24h):**
```bash
curl "http://localhost:8081/tippek?date=2024-12-15&timeWindow=16-24"
```

**All matches:**
```bash
curl "http://localhost:8081/tippek?date=2024-12-15&timeWindow=all"
```

### Limit Number of Matches

**Get only 5 matches:**
```bash
curl "http://localhost:8081/tippek?date=2024-12-15&limit=5"
```

**Get 10 evening matches:**
```bash
curl "http://localhost:8081/tippek?date=2024-12-15&timeWindow=16-24&limit=10"
```

## Pretty Print JSON Output

Add `| jq .` to format JSON nicely (requires jq):

```bash
curl "http://localhost:8081/tippek?date=2024-12-15&timeWindow=16-24&limit=5" | jq .
```

## Save Output to File

```bash
curl "http://localhost:8081/tippek?date=2024-12-15" -o tips.json
```

## Error Testing

### Invalid Date Format
```bash
curl "http://localhost:8081/tippek?date=15-12-2024"
# Returns JSON error: "Invalid date format. Use YYYY-MM-DD"
```

### Invalid Time Window
```bash
curl "http://localhost:8081/tippek?timeWindow=morning"
# Returns JSON error: "Invalid time window. Use: all, 0-8, 8-16, or 16-24"
```

### Invalid Limit
```bash
curl "http://localhost:8081/tippek?limit=500"
# Returns JSON error: "Invalid limit. Must be between 1 and 100"
```

### Invalid Endpoint
```bash
curl http://localhost:8081/invalid-endpoint
# Returns JSON 404 error
```

## Production Examples

### From Mobile App
```javascript
// React Native / JavaScript
const response = await fetch(
  'http://your-server.com:8081/tippek?date=2024-12-15&timeWindow=all&limit=20'
);
const data = await response.json();

if (data.ok) {
  console.log(`Got ${data.count} tips`);
  data.tips.forEach(tip => {
    console.log(`${tip.home} vs ${tip.away}: ${tip.tip} (${tip.odds})`);
  });
} else {
  console.error(`Error: ${data.error}`);
}
```

### From Android (Kotlin)
```kotlin
val url = "http://your-server.com:8081/tippek?date=2024-12-15&timeWindow=all&limit=20"
val request = Request.Builder().url(url).build()

client.newCall(request).execute().use { response ->
    val json = JSONObject(response.body?.string() ?: "{}")
    if (json.getBoolean("ok")) {
        val tips = json.getJSONArray("tips")
        for (i in 0 until tips.length()) {
            val tip = tips.getJSONObject(i)
            Log.d("Tip", "${tip.getString("home")} vs ${tip.getString("away")}")
        }
    }
}
```

## Command-Line Scripts

### Direct Algorithm Execution
```bash
cd api
node okosfoci-algoritmus.js
```

### With Custom Parameters
```bash
node okosfoci-algoritmus.js --date 2024-12-15 --timeWindow 16-24 --maxMatches 10
```

### Team Database Validation
```bash
npm run validate-teams
```

### With Custom Date
```bash
node validate-teams.js --date 2024-12-15
```

## Response Format

All successful responses follow this structure:

```json
{
  "ok": true,
  "date": "2024-12-15",
  "timeWindow": "16-24",
  "count": 3,
  "tips": [
    {
      "fixtureId": 1234567,
      "league": "Premier League",
      "date": "2024-12-15T20:00:00+00:00",
      "timeWindow": "16-24",
      "home": "Arsenal",
      "away": "Chelsea",
      "venue": "Emirates Stadium",
      "tip": "Home",
      "odds": 1.85,
      "betType": "Match Winner",
      "home_db": { "name": "Arsenal", "country": "England", ... },
      "away_db": { "name": "Chelsea", "country": "England", ... }
    }
  ]
}
```

All error responses follow this structure:

```json
{
  "ok": false,
  "error": "Error description here",
  "timestamp": "2024-12-15T10:30:00.000Z"
}
```

## Notes

- All responses are JSON (never HTML)
- Dates must be in YYYY-MM-DD format
- Time windows: all, 0-8, 8-16, 16-24
- Limit must be between 1 and 100
- CORS is enabled for all origins
- API requires valid API-Football key in .env file
