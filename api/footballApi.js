export const TIME_WINDOWS = [
  { key: "0-8", label: "0-8 óra", from: 0, to: 8 },
  { key: "8-16", label: "8-16 óra", from: 8, to: 16 },
  { key: "16-24", label: "16-24 óra", from: 16, to: 24 }
];

export async function getGamesByDate(dateStr) {
  return [
    {
      GameId: 1,
      HomeTeam: "Ferencváros",
      AwayTeam: "Debrecen",
      Status: "Scheduled",
      _startDate: new Date(dateStr + "T10:00:00"),
    },
    { 
      GameId: 2,
      HomeTeam: "Barcelona",
      AwayTeam: "Real Madrid",
      Status: "Live",
      _startDate: new Date(dateStr + "T11:30:00"),
    }
    // ... ide tehetsz több meccset
  ];
}

export function filterGamesByWindow(games, windowFrom, windowTo, nowMode = false) {
  const now = new Date();
  if (nowMode) {
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return games.filter(g => g._startDate >= now && g._startDate <= twoHoursLater);
  }
  return games.filter(g => {
    const h = g._startDate.getHours();
    return h >= windowFrom && h < windowTo;
  });
}
