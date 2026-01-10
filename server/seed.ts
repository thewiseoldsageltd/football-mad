import { db } from "./db";
import { teams, players, articles, articleTeams, matches, transfers, injuries, products } from "@shared/schema";

const premierLeagueTeams = [
  { name: "Arsenal", slug: "arsenal", shortName: "ARS", primaryColor: "#EF0107", secondaryColor: "#FFFFFF", stadiumName: "Emirates Stadium", founded: 1886, manager: "Mikel Arteta" },
  { name: "Aston Villa", slug: "aston-villa", shortName: "AVL", primaryColor: "#670E36", secondaryColor: "#95BFE5", stadiumName: "Villa Park", founded: 1874, manager: "Unai Emery" },
  { name: "Bournemouth", slug: "bournemouth", shortName: "BOU", primaryColor: "#DA291C", secondaryColor: "#000000", stadiumName: "Vitality Stadium", founded: 1899, manager: "Andoni Iraola" },
  { name: "Brentford", slug: "brentford", shortName: "BRE", primaryColor: "#E30613", secondaryColor: "#FFFFFF", stadiumName: "Brentford Community Stadium", founded: 1889, manager: "Thomas Frank" },
  { name: "Brighton & Hove Albion", slug: "brighton", shortName: "BHA", primaryColor: "#0057B8", secondaryColor: "#FFFFFF", stadiumName: "Amex Stadium", founded: 1901, manager: "Fabian Hurzeler" },
  { name: "Chelsea", slug: "chelsea", shortName: "CHE", primaryColor: "#034694", secondaryColor: "#FFFFFF", stadiumName: "Stamford Bridge", founded: 1905, manager: "Enzo Maresca" },
  { name: "Crystal Palace", slug: "crystal-palace", shortName: "CRY", primaryColor: "#1B458F", secondaryColor: "#C4122E", stadiumName: "Selhurst Park", founded: 1905, manager: "Oliver Glasner" },
  { name: "Everton", slug: "everton", shortName: "EVE", primaryColor: "#003399", secondaryColor: "#FFFFFF", stadiumName: "Goodison Park", founded: 1878, manager: "Sean Dyche" },
  { name: "Fulham", slug: "fulham", shortName: "FUL", primaryColor: "#000000", secondaryColor: "#FFFFFF", stadiumName: "Craven Cottage", founded: 1879, manager: "Marco Silva" },
  { name: "Ipswich Town", slug: "ipswich", shortName: "IPS", primaryColor: "#0033A0", secondaryColor: "#FFFFFF", stadiumName: "Portman Road", founded: 1878, manager: "Kieran McKenna" },
  { name: "Leicester City", slug: "leicester", shortName: "LEI", primaryColor: "#003090", secondaryColor: "#FDBE11", stadiumName: "King Power Stadium", founded: 1884, manager: "Steve Cooper" },
  { name: "Liverpool", slug: "liverpool", shortName: "LIV", primaryColor: "#C8102E", secondaryColor: "#FFFFFF", stadiumName: "Anfield", founded: 1892, manager: "Arne Slot" },
  { name: "Manchester City", slug: "manchester-city", shortName: "MCI", primaryColor: "#6CABDD", secondaryColor: "#FFFFFF", stadiumName: "Etihad Stadium", founded: 1880, manager: "Pep Guardiola" },
  { name: "Manchester United", slug: "manchester-united", shortName: "MUN", primaryColor: "#DA291C", secondaryColor: "#FFFFFF", stadiumName: "Old Trafford", founded: 1878, manager: "Ruben Amorim" },
  { name: "Newcastle United", slug: "newcastle", shortName: "NEW", primaryColor: "#241F20", secondaryColor: "#FFFFFF", stadiumName: "St. James' Park", founded: 1892, manager: "Eddie Howe" },
  { name: "Nottingham Forest", slug: "nottingham-forest", shortName: "NFO", primaryColor: "#DD0000", secondaryColor: "#FFFFFF", stadiumName: "City Ground", founded: 1865, manager: "Nuno Espirito Santo" },
  { name: "Southampton", slug: "southampton", shortName: "SOU", primaryColor: "#D71920", secondaryColor: "#FFFFFF", stadiumName: "St. Mary's Stadium", founded: 1885, manager: "Ivan Juric" },
  { name: "Tottenham Hotspur", slug: "tottenham", shortName: "TOT", primaryColor: "#132257", secondaryColor: "#FFFFFF", stadiumName: "Tottenham Hotspur Stadium", founded: 1882, manager: "Ange Postecoglou" },
  { name: "West Ham United", slug: "west-ham", shortName: "WHU", primaryColor: "#7A263A", secondaryColor: "#1BB1E7", stadiumName: "London Stadium", founded: 1895, manager: "Julen Lopetegui" },
  { name: "Wolverhampton Wanderers", slug: "wolves", shortName: "WOL", primaryColor: "#FDB913", secondaryColor: "#231F20", stadiumName: "Molineux Stadium", founded: 1877, manager: "Vitor Pereira" },
];

const sampleArticles = [
  { title: "Arsenal extend their lead at the top with dominant win", slug: "arsenal-extend-lead-dominant-win", excerpt: "The Gunners continue their title charge with another impressive victory at the Emirates.", category: "news", isFeatured: true, isTrending: true, tags: ["arsenal", "premier-league"] },
  { title: "Liverpool's perfect start continues under Arne Slot", slug: "liverpool-perfect-start-arne-slot", excerpt: "The new manager has transformed Liverpool into genuine title contenders.", category: "news", isTrending: true, tags: ["liverpool", "premier-league"] },
  { title: "Manchester City looking to bounce back after shock defeat", slug: "manchester-city-bounce-back-shock-defeat", excerpt: "Pep Guardiola's side face a crucial run of fixtures to get their title defense back on track.", category: "news", tags: ["manchester-city", "premier-league"] },
  { title: "Chelsea's young stars shining under Maresca", slug: "chelsea-young-stars-maresca", excerpt: "The Blues' academy products are proving their worth in the first team.", category: "analysis", tags: ["chelsea", "premier-league"] },
  { title: "Transfer deadline day: What you need to know", slug: "transfer-deadline-day-guide", excerpt: "A comprehensive guide to the final hours of the transfer window.", category: "transfers", isTrending: true, tags: ["transfers"] },
  { title: "FPL GW20: Top picks and differentials", slug: "fpl-gw20-top-picks-differentials", excerpt: "Who to target for Fantasy Premier League success this gameweek.", category: "fpl", tags: ["fpl"] },
  { title: "Injury crisis hits Manchester United ahead of derby", slug: "injury-crisis-manchester-united-derby", excerpt: "Ruben Amorim faces selection headache with multiple players sidelined.", category: "news", tags: ["manchester-united", "premier-league"] },
  { title: "Newcastle's European dreams still alive", slug: "newcastle-european-dreams-alive", excerpt: "Eddie Howe's side pushing for Champions League qualification.", category: "news", tags: ["newcastle", "premier-league"] },
  { title: "Tottenham's attacking woes continue", slug: "tottenham-attacking-woes-continue", excerpt: "Ange Postecoglou searching for solutions as goals dry up.", category: "analysis", tags: ["tottenham", "premier-league"] },
  { title: "Aston Villa eye January reinforcements", slug: "aston-villa-january-reinforcements", excerpt: "Unai Emery wants to strengthen his squad for the title push.", category: "transfers", tags: ["aston-villa", "transfers"] },
  { title: "Best FPL captain picks for the double gameweek", slug: "fpl-captain-picks-double-gameweek", excerpt: "Maximize your points with these captaincy options.", category: "fpl", tags: ["fpl"] },
  { title: "Brighton continue to punch above their weight", slug: "brighton-punch-above-weight", excerpt: "The Seagulls impressive form under new management continues.", category: "news", tags: ["brighton", "premier-league"] },
  { title: "West Ham struggling to find form under Lopetegui", slug: "west-ham-struggling-lopetegui", excerpt: "Pressure mounting on the Spanish manager at London Stadium.", category: "analysis", tags: ["west-ham", "premier-league"] },
  { title: "Crystal Palace looking solid under Glasner", slug: "crystal-palace-solid-glasner", excerpt: "Oliver Glasner has turned the Eagles into a tough team to beat.", category: "news", tags: ["crystal-palace", "premier-league"] },
  { title: "Everton's survival fight intensifies", slug: "everton-survival-fight-intensifies", excerpt: "Sean Dyche's side need results fast to avoid the drop.", category: "news", tags: ["everton", "premier-league"] },
  { title: "Leicester City's return to the Premier League assessed", slug: "leicester-city-premier-league-return", excerpt: "How the Foxes have fared since promotion.", category: "analysis", tags: ["leicester", "premier-league"] },
  { title: "Nottingham Forest's remarkable rise continues", slug: "nottingham-forest-remarkable-rise", excerpt: "From relegation candidates to European hopefuls.", category: "news", isTrending: true, tags: ["nottingham-forest", "premier-league"] },
  { title: "Southampton face uphill battle to survive", slug: "southampton-uphill-battle-survive", excerpt: "New manager faces huge task at St. Mary's.", category: "news", tags: ["southampton", "premier-league"] },
  { title: "Brentford's set-piece threat analyzed", slug: "brentford-set-piece-threat-analyzed", excerpt: "How Thomas Frank's side weaponize dead balls.", category: "analysis", tags: ["brentford", "premier-league"] },
  { title: "Wolves looking for January signings to boost survival hopes", slug: "wolves-january-signings-survival", excerpt: "New manager prioritizes additions in the transfer window.", category: "transfers", tags: ["wolves", "transfers"] },
  { title: "Bournemouth's impressive home form", slug: "bournemouth-impressive-home-form", excerpt: "The Cherries are making the Vitality Stadium a fortress.", category: "news", tags: ["bournemouth", "premier-league"] },
  { title: "Fulham's European ambitions", slug: "fulham-european-ambitions", excerpt: "Marco Silva has transformed the Cottagers into dark horses.", category: "analysis", tags: ["fulham", "premier-league"] },
  { title: "Ipswich Town adjusting to Premier League life", slug: "ipswich-adjusting-premier-league", excerpt: "Kieran McKenna's side finding their feet at the top level.", category: "news", tags: ["ipswich", "premier-league"] },
];

const sampleTransfers = [
  { playerName: "Viktor Gyokeres", fromTeamName: "Sporting CP", toTeamName: "Manchester United", fee: "£85m", status: "rumour", reliabilityTier: "A", sourceName: "Sky Sports" },
  { playerName: "Alexander Isak", fromTeamName: "Newcastle United", toTeamName: "Arsenal", fee: "£120m", status: "rumour", reliabilityTier: "B", sourceName: "The Athletic" },
  { playerName: "Marcus Rashford", fromTeamName: "Manchester United", toTeamName: "Barcelona", fee: "Loan", status: "rumour", reliabilityTier: "A", sourceName: "Fabrizio Romano" },
  { playerName: "Christopher Nkunku", fromTeamName: "Chelsea", toTeamName: "Bayern Munich", fee: "£60m", status: "rumour", reliabilityTier: "C", sourceName: "BILD" },
  { playerName: "Jhon Duran", fromTeamName: "Aston Villa", toTeamName: "Chelsea", fee: "£60m", status: "confirmed", reliabilityTier: "A", sourceName: "Official" },
  { playerName: "Omar Marmoush", fromTeamName: "Eintracht Frankfurt", toTeamName: "Manchester City", fee: "£65m", status: "confirmed", reliabilityTier: "A", sourceName: "Official" },
  { playerName: "Khvicha Kvaratskhelia", fromTeamName: "Napoli", toTeamName: "Paris Saint-Germain", fee: "£60m", status: "confirmed", reliabilityTier: "A", sourceName: "Official" },
  { playerName: "Mathys Tel", fromTeamName: "Bayern Munich", toTeamName: "Tottenham", fee: "Loan", status: "rumour", reliabilityTier: "B", sourceName: "The Telegraph" },
  { playerName: "Randal Kolo Muani", fromTeamName: "Paris Saint-Germain", toTeamName: "Juventus", fee: "Loan", status: "confirmed", reliabilityTier: "A", sourceName: "Official" },
  { playerName: "Patrick Dorgu", fromTeamName: "Lecce", toTeamName: "Manchester United", fee: "£30m", status: "rumour", reliabilityTier: "A", sourceName: "Fabrizio Romano" },
  { playerName: "Morten Hjulmand", fromTeamName: "Sporting CP", toTeamName: "Liverpool", fee: "£45m", status: "rumour", reliabilityTier: "C", sourceName: "Portuguese Media" },
  { playerName: "Martin Zubimendi", fromTeamName: "Real Sociedad", toTeamName: "Arsenal", fee: "£52m", status: "rumour", reliabilityTier: "B", sourceName: "The Athletic" },
];

const sampleInjuries = [
  { playerName: "Bukayo Saka", teamName: "Arsenal", status: "OUT", injuryType: "Hamstring", expectedReturn: "Late February", confidencePercent: 70 },
  { playerName: "Gabriel Jesus", teamName: "Arsenal", status: "OUT", injuryType: "ACL", expectedReturn: "Late 2025", confidencePercent: 90 },
  { playerName: "Diogo Jota", teamName: "Liverpool", status: "OUT", injuryType: "Calf", expectedReturn: "Early February", confidencePercent: 60 },
  { playerName: "John Stones", teamName: "Manchester City", status: "DOUBTFUL", injuryType: "Knee", expectedReturn: "Next week", confidencePercent: 50 },
  { playerName: "Ruben Dias", teamName: "Manchester City", status: "OUT", injuryType: "Muscle", expectedReturn: "Mid January", confidencePercent: 80 },
  { playerName: "Reece James", teamName: "Chelsea", status: "OUT", injuryType: "Hamstring", expectedReturn: "February", confidencePercent: 60 },
  { playerName: "Romeo Lavia", teamName: "Chelsea", status: "OUT", injuryType: "Thigh", expectedReturn: "Late January", confidencePercent: 70 },
  { playerName: "Micky van de Ven", teamName: "Tottenham", status: "DOUBTFUL", injuryType: "Hamstring", expectedReturn: "TBD", confidencePercent: 40 },
  { playerName: "Destiny Udogie", teamName: "Tottenham", status: "OUT", injuryType: "Hamstring", expectedReturn: "End of January", confidencePercent: 75 },
  { playerName: "Luke Shaw", teamName: "Manchester United", status: "FIT", injuryType: "Calf", expectedReturn: "Available", confidencePercent: 95 },
  { playerName: "Tyrone Mings", teamName: "Aston Villa", status: "FIT", injuryType: "ACL", expectedReturn: "Available", confidencePercent: 85 },
  { playerName: "Sven Botman", teamName: "Newcastle United", status: "OUT", injuryType: "ACL", expectedReturn: "March 2025", confidencePercent: 80 },
  { playerName: "Callum Wilson", teamName: "Newcastle United", status: "OUT", injuryType: "Back", expectedReturn: "February", confidencePercent: 55 },
  { playerName: "Adam Lallana", teamName: "Southampton", status: "OUT", injuryType: "Hamstring", expectedReturn: "TBD", confidencePercent: 30 },
  { playerName: "Tomas Soucek", teamName: "West Ham", status: "DOUBTFUL", injuryType: "Knee", expectedReturn: "Next match", confidencePercent: 65 },
];

const sampleProducts = [
  { name: "Football Mad Classic T-Shirt", slug: "fm-classic-tshirt", description: "Premium cotton t-shirt with the Football Mad logo.", price: "24.99", category: "clothing", featured: true, inStock: true },
  { name: "Football Mad Hoodie", slug: "fm-hoodie", description: "Comfortable fleece hoodie for matchday.", price: "49.99", category: "clothing", featured: true, inStock: true },
  { name: "Football Mad Cap", slug: "fm-cap", description: "Adjustable cap with embroidered logo.", price: "19.99", category: "accessories", inStock: true },
  { name: "Football Mad Mug", slug: "fm-mug", description: "Ceramic mug for your matchday brew.", price: "12.99", category: "accessories", inStock: true },
  { name: "Football Mad Scarf", slug: "fm-scarf", description: "Premium knitted scarf.", price: "24.99", category: "accessories", featured: true, inStock: true },
  { name: "Football Mad Phone Case", slug: "fm-phone-case", description: "Protective case with Football Mad design.", price: "14.99", category: "accessories", inStock: true },
  { name: "Football Mad Water Bottle", slug: "fm-water-bottle", description: "Stainless steel water bottle.", price: "17.99", category: "accessories", inStock: true },
  { name: "Football Mad Backpack", slug: "fm-backpack", description: "Durable backpack for all occasions.", price: "39.99", category: "accessories", inStock: true },
];

async function seed() {
  console.log("Starting database seed...");

  // Seed teams
  console.log("Seeding teams...");
  const insertedTeams: { id: string; slug: string }[] = [];
  for (const team of premierLeagueTeams) {
    const [inserted] = await db.insert(teams).values({
      ...team,
      league: "Premier League",
    }).onConflictDoNothing().returning();
    if (inserted) {
      insertedTeams.push({ id: inserted.id, slug: inserted.slug });
    }
  }
  
  // Fetch all teams for reference
  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map(t => [t.slug, t.id]));

  // Seed articles
  console.log("Seeding articles...");
  const articleContent = `<p>This is a comprehensive article covering the latest developments in football. Our team of experts has analyzed the key moments and provided insights into what this means for the season ahead.</p>
<h2>Key Highlights</h2>
<p>The match featured several standout performances, with players showing incredible skill and determination. The tactical battle between the managers was fascinating to watch.</p>
<p>Looking ahead, both teams will need to maintain this level of performance if they want to achieve their season objectives. The competition is fierce, and every point matters.</p>
<h2>What This Means</h2>
<p>For the league standings, this result could prove pivotal. The race for the top four remains incredibly tight, with several teams still in contention.</p>
<p>Fans will be eagerly anticipating the next fixture, where we expect another thrilling encounter. Stay tuned to Football Mad for all the latest updates and analysis.</p>`;

  for (const article of sampleArticles) {
    const [inserted] = await db.insert(articles).values({
      ...article,
      content: articleContent,
      authorName: "Football Mad",
      viewCount: Math.floor(Math.random() * 50000) + 1000,
      publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    }).onConflictDoNothing().returning();
    
    // Link articles to teams based on tags
    if (inserted && article.tags) {
      for (const tag of article.tags) {
        const teamId = teamMap.get(tag);
        if (teamId) {
          await db.insert(articleTeams).values({
            articleId: inserted.id,
            teamId,
          }).onConflictDoNothing();
        }
      }
    }
  }

  // Seed matches
  console.log("Seeding matches...");
  const arsenalId = teamMap.get("arsenal");
  const liverpoolId = teamMap.get("liverpool");
  const manchesterCityId = teamMap.get("manchester-city");
  const chelseaId = teamMap.get("chelsea");
  const tottenhamId = teamMap.get("tottenham");
  const manchesterUnitedId = teamMap.get("manchester-united");
  const newcastleId = teamMap.get("newcastle");
  const astonVillaId = teamMap.get("aston-villa");
  const brightonId = teamMap.get("brighton");
  const westHamId = teamMap.get("west-ham");

  const now = new Date();
  const matchFixtures = [
    { homeTeamId: arsenalId!, awayTeamId: manchesterCityId!, venue: "Emirates Stadium", kickoffTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
    { homeTeamId: liverpoolId!, awayTeamId: chelseaId!, venue: "Anfield", kickoffTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
    { homeTeamId: tottenhamId!, awayTeamId: manchesterUnitedId!, venue: "Tottenham Hotspur Stadium", kickoffTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000) },
    { homeTeamId: newcastleId!, awayTeamId: arsenalId!, venue: "St. James' Park", kickoffTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) },
    { homeTeamId: manchesterCityId!, awayTeamId: liverpoolId!, venue: "Etihad Stadium", kickoffTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000) },
    { homeTeamId: chelseaId!, awayTeamId: astonVillaId!, venue: "Stamford Bridge", kickoffTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    { homeTeamId: brightonId!, awayTeamId: tottenhamId!, venue: "Amex Stadium", kickoffTime: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000) },
    { homeTeamId: westHamId!, awayTeamId: manchesterUnitedId!, venue: "London Stadium", kickoffTime: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000) },
    // Past matches
    { homeTeamId: arsenalId!, awayTeamId: liverpoolId!, venue: "Emirates Stadium", kickoffTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), homeScore: 2, awayScore: 2, status: "finished" },
    { homeTeamId: manchesterCityId!, awayTeamId: tottenhamId!, venue: "Etihad Stadium", kickoffTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), homeScore: 3, awayScore: 0, status: "finished" },
    { homeTeamId: chelseaId!, awayTeamId: manchesterUnitedId!, venue: "Stamford Bridge", kickoffTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), homeScore: 1, awayScore: 1, status: "finished" },
  ];

  for (const match of matchFixtures) {
    const homeTeam = allTeams.find(t => t.id === match.homeTeamId);
    const awayTeam = allTeams.find(t => t.id === match.awayTeamId);
    if (homeTeam && awayTeam) {
      await db.insert(matches).values({
        ...match,
        slug: `${homeTeam.slug}-vs-${awayTeam.slug}-${match.kickoffTime.toISOString().split('T')[0]}`,
        competition: "Premier League",
        status: match.status || "scheduled",
      }).onConflictDoNothing();
    }
  }

  // Seed transfers
  console.log("Seeding transfers...");
  for (const transfer of sampleTransfers) {
    await db.insert(transfers).values({
      ...transfer,
      notes: `${transfer.playerName} is a highly sought-after target. Multiple clubs are interested in securing his services.`,
    }).onConflictDoNothing();
  }

  // Seed injuries
  console.log("Seeding injuries...");
  for (const injury of sampleInjuries) {
    const teamId = allTeams.find(t => t.name === injury.teamName)?.id;
    await db.insert(injuries).values({
      ...injury,
      teamId,
      sourceName: "Official Club Statement",
    }).onConflictDoNothing();
  }

  // Seed products
  console.log("Seeding products...");
  for (const product of sampleProducts) {
    await db.insert(products).values(product).onConflictDoNothing();
  }

  console.log("Database seed completed!");
}

seed().catch(console.error);
