import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { reportDatabaseUnavailable } from "./exclusive";
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from "../lib/categories";
import { BADGE_DEFINITIONS } from "../lib/badges";

const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = process.env.SWOPIT_DATA_DIR ?? "./.swopit-data";
const PASSWORD = "swopit123";
const WELCOME_BONUS = 50;

const PLACES = {
  frankfurt: { city: "Frankfurt am Main", postalCode: "60311", latitude: 50.1109, longitude: 8.6821 },
  offenbach: { city: "Offenbach am Main", postalCode: "63065", latitude: 50.0955, longitude: 8.7761 },
  mainz: { city: "Mainz", postalCode: "55116", latitude: 49.9929, longitude: 8.2473 },
  wiesbaden: { city: "Wiesbaden", postalCode: "65183", latitude: 50.0782, longitude: 8.2398 },
  bornheim: { city: "Frankfurt am Main", postalCode: "60385", latitude: 50.1290, longitude: 8.7080 },
  sachsenhausen: { city: "Frankfurt am Main", postalCode: "60594", latitude: 50.0990, longitude: 8.6870 },
  badhomburg: { city: "Bad Homburg", postalCode: "61348", latitude: 50.2268, longitude: 8.6180 },
  hanau: { city: "Hanau", postalCode: "63450", latitude: 50.1330, longitude: 8.9160 },
};

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);
const hoursAgo = (n: number) => new Date(Date.now() - n * 36e5);

export async function main() {
  const { db, close } = DATABASE_URL
    ? (() => {
        const pool = new Pool({ connectionString: DATABASE_URL });
        return { db: drizzleNodePg(pool, { schema, casing: "snake_case" }), close: () => pool.end() };
      })()
    : (() => {
        const client = new PGlite(DATA_DIR);
        return { db: drizzlePglite(client, { schema, casing: "snake_case" }), close: () => client.close() };
      })();

  console.log("→ Clearing existing data…");
  await db.execute(sql`
    TRUNCATE TABLE
      user_badges, badges, feedback, reports, notifications, swoppies, reviews,
      wallet_transactions, wallets, swaps, messages, conversation_members,
      conversations, listing_images, listings, categories, sessions, profiles, users
    RESTART IDENTITY CASCADE
  `);

  /* ---------------------------------------------------------- categories */
  const categoryRows = await db
    .insert(schema.categories)
    .values([
      ...PRODUCT_CATEGORIES.map((c, i) => ({ ...c, kind: "PRODUCT" as const, sortOrder: i })),
      ...SERVICE_CATEGORIES.map((c, i) => ({ ...c, kind: "SERVICE" as const, sortOrder: i })),
    ])
    .returning();
  const cat = (slug: string) => {
    const found = categoryRows.find((c) => c.slug === slug);
    if (!found) throw new Error(`Unknown category ${slug}`);
    return found.id;
  };

  /* -------------------------------------------------------------- badges */
  const badgeRows = await db
    .insert(schema.badges)
    .values(BADGE_DEFINITIONS.map((b) => ({ ...b })))
    .returning();
  const badge = (slug: string) => badgeRows.find((b) => b.slug === slug)!.id;

  /* --------------------------------------------------------------- users */
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const people = [
    { key: "tobias", email: "demo@swop-it.local", displayName: "Tobias Theis", place: PLACES.frankfurt, joined: daysAgo(210), bio: "Frankfurt DIY nerd. My garage is basically a tool library — borrow away.", role: "MEMBER" as const },
    { key: "anna", email: "anna@swop-it.local", displayName: "Anna Weber", place: PLACES.offenbach, joined: daysAgo(180), bio: "Teacher, dog person, terrible at assembling furniture.", role: "MEMBER" as const },
    { key: "mark", email: "mark@swop-it.local", displayName: "Mark Fischer", place: PLACES.bornheim, joined: daysAgo(150), bio: "Carpenter by trade. Happy to help with anything that involves a screwdriver.", role: "MEMBER" as const },
    { key: "lena", email: "lena@swop-it.local", displayName: "Lena Schulz", place: PLACES.mainz, joined: daysAgo(120), bio: "Photographer. Camping in summer, baking in winter.", role: "MEMBER" as const },
    { key: "jonas", email: "jonas@swop-it.local", displayName: "Jonas Becker", place: PLACES.wiesbaden, joined: daysAgo(95), bio: "IT support for friends and family since 2004. Now for the neighbourhood too.", role: "MEMBER" as const },
    { key: "sofia", email: "sofia@swop-it.local", displayName: "Sofia Ricci", place: PLACES.sachsenhausen, joined: daysAgo(70), bio: "From Bologna. I cook, I garden, I talk a lot of Italian.", role: "MEMBER" as const },
    { key: "david", email: "colin@swop-it.local", displayName: "Colin Richter", place: PLACES.offenbach, joined: daysAgo(45), bio: "Cyclist with a van and a trailer. Moving day? Call me.", role: "MEMBER" as const },
    { key: "mira", email: "mira@swop-it.local", displayName: "Mira Yilmaz", place: PLACES.badhomburg, joined: daysAgo(30), bio: "Student, part-time tutor, full-time plant collector.", role: "MEMBER" as const },
    { key: "admin", email: "admin@swop-it.local", displayName: "Swop-it Admin", place: PLACES.frankfurt, joined: daysAgo(240), bio: "Keeping the community friendly.", role: "ADMIN" as const },
  ];

  const userRows = await db
    .insert(schema.users)
    .values(
      people.map((p) => ({
        email: p.email,
        passwordHash,
        emailVerified: true,
        role: p.role,
        createdAt: p.joined,
      })),
    )
    .returning();

  const id: Record<string, string> = {};
  people.forEach((p, i) => (id[p.key] = userRows[i]!.id));

  await db.insert(schema.profiles).values(
    people.map((p, i) => ({
      userId: userRows[i]!.id,
      displayName: p.displayName,
      bio: p.bio,
      city: p.place.city,
      postalCode: p.place.postalCode,
      latitude: p.place.latitude,
      longitude: p.place.longitude,
      createdAt: p.joined,
    })),
  );

  await db.insert(schema.wallets).values(people.map((p, i) => ({ userId: userRows[i]!.id, balance: 0 })));

  // Everybody starts with the welcome bonus, booked through the ledger.
  for (const [i, p] of people.entries()) {
    await db.insert(schema.walletTransactions).values({
      userId: userRows[i]!.id,
      type: "WELCOME_BONUS",
      amount: WELCOME_BONUS,
      description: "Welcome to Swop-it",
      createdAt: p.joined,
    });
    await db
      .update(schema.wallets)
      .set({ balance: sql`${schema.wallets.balance} + ${WELCOME_BONUS}` })
      .where(sql`${schema.wallets.userId} = ${userRows[i]!.id}`);
  }

  /* ------------------------------------------------------------ listings */
  type Seed = typeof schema.listings.$inferInsert & { owner: string; place: keyof typeof PLACES };
  const L = (
    owner: string,
    place: keyof typeof PLACES,
    rest: Omit<Seed, "ownerId" | "owner" | "place" | "city" | "postalCode" | "latitude" | "longitude">,
  ): typeof schema.listings.$inferInsert => ({
    ownerId: id[owner]!,
    city: PLACES[place].city,
    postalCode: PLACES[place].postalCode,
    latitude: PLACES[place].latitude,
    longitude: PLACES[place].longitude,
    ...rest,
  });

  const listingSeeds: (typeof schema.listings.$inferInsert)[] = [
    // ---- product offers (20)
    L("tobias", "frankfurt", { type: "OFFER", kind: "PRODUCT", categoryId: cat("tools"), title: "Bosch Pressure Washer", description: "Powerful 140 bar pressure washer. Ideal for patios, garden furniture and cars. Comes with two nozzles and a 8 m hose. I'll show you how it works when you pick it up.", pricePoints: 15, priceUnit: "PER_DAY", availability: "Saturday and Sunday", tags: ["cleaning", "patio", "car"], loanDurationDays: 3, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(24) }),
    L("tobias", "frankfurt", { type: "OFFER", kind: "PRODUCT", categoryId: cat("tools"), title: "Cordless Drill + Bit Set", description: "Makita 18 V cordless drill with two batteries and a 60-piece bit set. Enough for any flat-pack emergency.", pricePoints: 8, priceUnit: "PER_DAY", availability: "Most weekday evenings", tags: ["drill", "diy"], loanDurationDays: 5, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(21) }),
    L("tobias", "frankfurt", { type: "OFFER", kind: "PRODUCT", categoryId: cat("tools"), title: "Wallpaper Steamer", description: "Strips old wallpaper in minutes instead of an entire weekend. Includes a spare gasket.", pricePoints: 10, priceUnit: "PER_DAY", availability: "Flexible", tags: ["renovation", "wallpaper"], loanDurationDays: 4, handover: "PICKUP", condition: "USED", createdAt: daysAgo(9) }),
    L("mark", "bornheim", { type: "OFFER", kind: "PRODUCT", categoryId: cat("party-events"), title: "Folding Party Tables & Benches", description: "Classic beer-tent set: two benches and one table, seats 8-10. Fits in an estate car with the seats down.", pricePoints: 20, priceUnit: "PER_WEEKEND", availability: "Weekends", tags: ["party", "garden", "birthday"], loanDurationDays: 3, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(30) }),
    L("mark", "bornheim", { type: "OFFER", kind: "PRODUCT", categoryId: cat("garden"), title: "Petrol Lawn Mower", description: "Self-propelled mower for lawns up to 800 m². Freshly serviced, tank filled. Please return it clean.", pricePoints: 12, priceUnit: "PER_DAY", availability: "Weekdays", tags: ["lawn", "garden"], loanDurationDays: 2, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(28) }),
    L("mark", "bornheim", { type: "OFFER", kind: "PRODUCT", categoryId: cat("tools"), title: "Aluminium Ladder 4 m", description: "Telescopic aluminium ladder, extends to 4 m and folds down to 90 cm. Light enough to carry by bike, honestly.", pricePoints: 6, priceUnit: "PER_DAY", availability: "Flexible", tags: ["ladder", "diy"], loanDurationDays: 7, handover: "BOTH", condition: "GOOD", createdAt: daysAgo(17) }),
    L("lena", "mainz", { type: "OFFER", kind: "PRODUCT", categoryId: cat("outdoor"), title: "Two-Person Camping Tent", description: "Lightweight 2-person tent, 2.8 kg, waterproof to 3000 mm. Used for three trips, always dried properly.", pricePoints: 14, priceUnit: "PER_WEEKEND", availability: "Apr–Oct", tags: ["camping", "festival", "hiking"], loanDurationDays: 7, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(26) }),
    L("lena", "mainz", { type: "OFFER", kind: "PRODUCT", categoryId: cat("electronics"), title: "Full-HD Beamer + Screen", description: "1080p projector with 120\" pull-up screen and HDMI cable. Perfect for a garden cinema evening.", pricePoints: 18, priceUnit: "PER_DAY", availability: "Weekends", tags: ["cinema", "projector", "party"], loanDurationDays: 2, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(19) }),
    L("lena", "mainz", { type: "OFFER", kind: "PRODUCT", categoryId: cat("electronics"), title: "Canon DSLR with 50mm Lens", description: "Canon EOS 800D with a 50 mm f/1.8. Great for a portrait shoot or a family celebration. Two batteries and a 32 GB card included.", pricePoints: 25, priceUnit: "PER_DAY", availability: "Ask me", tags: ["camera", "photography"], loanDurationDays: 3, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(12) }),
    L("anna", "offenbach", { type: "OFFER", kind: "PRODUCT", categoryId: cat("kitchen"), title: "KitchenAid Stand Mixer", description: "The classic red one. Dough hook, whisk and flat beater included. Bread, cakes, pasta — it copes with all of it.", pricePoints: 10, priceUnit: "PER_DAY", availability: "Flexible", tags: ["baking", "kitchen"], loanDurationDays: 3, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(22) }),
    L("anna", "offenbach", { type: "OFFER", kind: "PRODUCT", categoryId: cat("kids-family"), title: "Bicycle Child Trailer", description: "Croozer trailer for one child, converts to a buggy. Rain cover included. Our daughter has outgrown it.", pricePoints: 12, priceUnit: "PER_DAY", availability: "Weekends", tags: ["kids", "bike", "trailer"], loanDurationDays: 5, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(15) }),
    L("anna", "offenbach", { type: "OFFER", kind: "PRODUCT", categoryId: cat("kitchen"), title: "Raclette Grill for 8", description: "Eight-pan raclette with a stone top. The obvious answer to a winter dinner party.", pricePoints: 8, priceUnit: "PER_WEEKEND", availability: "Oct–Mar", tags: ["raclette", "dinner", "party"], loanDurationDays: 3, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(6) }),
    L("jonas", "wiesbaden", { type: "OFFER", kind: "PRODUCT", categoryId: cat("electronics"), title: "Portable PA Speaker", description: "Battery-powered 200 W PA with a wireless microphone. Runs about 8 hours. Loud enough for a street party.", pricePoints: 22, priceUnit: "PER_WEEKEND", availability: "Weekends", tags: ["music", "party", "speaker"], loanDurationDays: 3, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(20) }),
    L("jonas", "wiesbaden", { type: "OFFER", kind: "PRODUCT", categoryId: cat("sports"), title: "Two Stand-Up Paddle Boards", description: "Inflatable SUPs with pump, paddles and leashes. The Rhine and the Main are right there.", pricePoints: 20, priceUnit: "PER_DAY", availability: "May–Sep", tags: ["sup", "water", "sport"], loanDurationDays: 3, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(11) }),
    L("sofia", "sachsenhausen", { type: "OFFER", kind: "PRODUCT", categoryId: cat("kitchen"), title: "Pasta Machine (Marcato)", description: "Hand-cranked Italian pasta machine with tagliatelle and spaghetti attachments. I'll throw in my nonna's dough recipe.", pricePoints: 6, priceUnit: "PER_DAY", availability: "Flexible", tags: ["pasta", "italian", "kitchen"], loanDurationDays: 4, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(14) }),
    L("sofia", "sachsenhausen", { type: "OFFER", kind: "PRODUCT", categoryId: cat("garden"), title: "Electric Hedge Trimmer", description: "600 W hedge trimmer with a 55 cm blade and a 10 m extension cable. Cuts a garden hedge in under an hour.", pricePoints: 9, priceUnit: "PER_DAY", availability: "Weekends", tags: ["hedge", "garden"], loanDurationDays: 2, handover: "PICKUP", condition: "USED", createdAt: daysAgo(8) }),
    L("david", "offenbach", { type: "OFFER", kind: "PRODUCT", categoryId: cat("mobility"), title: "Cargo Bike (Long John)", description: "Electric cargo bike, 60 kg load. Weekly shop, IKEA run, two kids — all fine. Helmet not included.", pricePoints: 18, priceUnit: "PER_DAY", availability: "Weekdays", tags: ["cargo", "bike", "moving"], loanDurationDays: 2, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(18) }),
    L("david", "offenbach", { type: "OFFER", kind: "PRODUCT", categoryId: cat("home"), title: "Moving Boxes (20) + Sack Truck", description: "Twenty sturdy moving boxes and a folding sack truck. Return the boxes flat and we're good.", pricePoints: 10, priceUnit: "PER_WEEK", availability: "Flexible", tags: ["moving", "boxes"], loanDurationDays: 14, handover: "BOTH", condition: "USED", createdAt: daysAgo(5) }),
    L("mira", "badhomburg", { type: "OFFER", kind: "PRODUCT", categoryId: cat("sports"), title: "Ski Set 165 cm + Boots 39", description: "Complete ski set, serviced last season. Boots are size 39, poles included.", pricePoints: 16, priceUnit: "PER_WEEK", availability: "Dec–Mar", tags: ["ski", "winter", "sport"], loanDurationDays: 10, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(13) }),
    L("mira", "badhomburg", { type: "OFFER", kind: "PRODUCT", categoryId: cat("party-events"), title: "Fairy Lights & Garden Torches", description: "60 m of warm fairy lights plus eight garden torches. Turns any back yard into something nicer at 9 pm.", pricePoints: 7, priceUnit: "PER_WEEKEND", availability: "Flexible", tags: ["lights", "garden", "party"], loanDurationDays: 4, handover: "PICKUP", condition: "GOOD", createdAt: daysAgo(3) }),

    // ---- service offers (15)
    L("mark", "bornheim", { type: "OFFER", kind: "SERVICE", categoryId: cat("home-diy"), title: "Furniture Assembly", description: "Fifteen years as a carpenter. I bring my own tools and I have assembled more PAX wardrobes than I care to count.", pricePoints: 30, priceUnit: "TOTAL", availability: "Evenings and Saturdays", tags: ["ikea", "assembly", "diy"], estimatedMinutes: 120, presence: "IN_PERSON", createdAt: daysAgo(29) }),
    L("mark", "bornheim", { type: "OFFER", kind: "SERVICE", categoryId: cat("home-diy"), title: "Hanging Shelves & Pictures", description: "Straight, level, and in the right wall plug. Includes finding the studs and the cables behind the plaster.", pricePoints: 15, priceUnit: "PER_HOUR", availability: "Saturdays", tags: ["shelves", "drilling"], estimatedMinutes: 60, presence: "IN_PERSON", createdAt: daysAgo(16) }),
    L("sofia", "sachsenhausen", { type: "OFFER", kind: "SERVICE", categoryId: cat("garden-service"), title: "Garden Help & Planting", description: "Weeding, pruning, planting a balcony box or reviving a sad-looking bed. I bring gloves and opinions.", pricePoints: 25, priceUnit: "TOTAL", availability: "Weekends", tags: ["garden", "planting"], estimatedMinutes: 180, presence: "IN_PERSON", createdAt: daysAgo(27) }),
    L("sofia", "sachsenhausen", { type: "OFFER", kind: "SERVICE", categoryId: cat("languages"), title: "Italian Conversation Hour", description: "Relaxed Italian conversation over coffee. Beginner to intermediate. I correct gently, I promise.", pricePoints: 12, priceUnit: "PER_HOUR", availability: "Tue & Thu evenings", tags: ["italian", "language", "conversation"], estimatedMinutes: 60, presence: "EITHER", createdAt: daysAgo(10) }),
    L("sofia", "sachsenhausen", { type: "OFFER", kind: "SERVICE", categoryId: cat("creative"), title: "Cooking Together: Fresh Pasta", description: "Two hours in your kitchen or mine, and you'll never buy dried tagliatelle again.", pricePoints: 28, priceUnit: "TOTAL", availability: "Sunday afternoons", tags: ["cooking", "pasta", "italian"], estimatedMinutes: 120, presence: "IN_PERSON", createdAt: daysAgo(4) }),
    L("anna", "offenbach", { type: "OFFER", kind: "SERVICE", categoryId: cat("pets"), title: "Dog Sitting (Weekends)", description: "I'll take your dog for the weekend. Big garden, two walks a day, and photo updates whether you want them or not.", pricePoints: 20, priceUnit: "TOTAL", availability: "Fri–Sun", tags: ["dog", "sitting", "pets"], estimatedMinutes: 480, presence: "IN_PERSON", createdAt: daysAgo(23) }),
    L("anna", "offenbach", { type: "OFFER", kind: "SERVICE", categoryId: cat("education"), title: "Maths Tutoring (Years 5–10)", description: "Secondary school teacher. Patient with fractions, quadratics and last-minute exam panic.", pricePoints: 18, priceUnit: "PER_HOUR", availability: "Weekday afternoons", tags: ["maths", "tutoring", "school"], estimatedMinutes: 60, presence: "EITHER", createdAt: daysAgo(7) }),
    L("jonas", "wiesbaden", { type: "OFFER", kind: "SERVICE", categoryId: cat("it-tech"), title: "IT Support & Computer Rescue", description: "Slow laptop, Wi-Fi that drops, a printer that refuses to exist. I'll sort it out, remotely or at your place.", pricePoints: 20, priceUnit: "PER_HOUR", availability: "Weekday evenings", tags: ["it", "laptop", "wifi"], estimatedMinutes: 60, presence: "EITHER", createdAt: daysAgo(25) }),
    L("jonas", "wiesbaden", { type: "OFFER", kind: "SERVICE", categoryId: cat("it-tech"), title: "Smart Home Setup", description: "Lights, thermostats, doorbell — set up properly and explained in plain language so you can change it yourself later.", pricePoints: 35, priceUnit: "TOTAL", availability: "Saturdays", tags: ["smarthome", "setup"], estimatedMinutes: 150, presence: "IN_PERSON", createdAt: daysAgo(2) }),
    L("lena", "mainz", { type: "OFFER", kind: "SERVICE", categoryId: cat("creative"), title: "Portrait Photo Session", description: "One hour outdoors, around 15 edited photos. Good for job applications, a new profile picture, or just because.", pricePoints: 40, priceUnit: "TOTAL", availability: "Golden hour, weekends", tags: ["photography", "portrait"], estimatedMinutes: 90, presence: "IN_PERSON", createdAt: daysAgo(20) }),
    L("david", "offenbach", { type: "OFFER", kind: "SERVICE", categoryId: cat("transport"), title: "Transport Help with Van", description: "I have a van and a strong back. Sofa, fridge, a whole small flat — Frankfurt and around.", pricePoints: 30, priceUnit: "PER_HOUR", availability: "Weekends", tags: ["moving", "van", "transport"], estimatedMinutes: 120, presence: "IN_PERSON", createdAt: daysAgo(9) }),
    L("david", "offenbach", { type: "OFFER", kind: "SERVICE", categoryId: cat("everyday-help"), title: "Bike Repair & Service", description: "Brakes, gears, punctures, a full spring service. I do it in my courtyard, you get to watch and learn.", pricePoints: 15, priceUnit: "TOTAL", availability: "Sunday mornings", tags: ["bike", "repair"], estimatedMinutes: 60, presence: "IN_PERSON", createdAt: daysAgo(1) }),
    L("mira", "badhomburg", { type: "OFFER", kind: "SERVICE", categoryId: cat("languages"), title: "English Conversation Practice", description: "Grew up bilingual. One hour of proper conversation, plus honest feedback on pronunciation.", pricePoints: 15, priceUnit: "PER_HOUR", availability: "Mon/Wed evenings", tags: ["english", "language"], estimatedMinutes: 60, presence: "REMOTE", createdAt: daysAgo(12) }),
    L("mira", "badhomburg", { type: "OFFER", kind: "SERVICE", categoryId: cat("everyday-help"), title: "Shopping Assistance", description: "Weekly shop picked up and carried to your door. Especially for neighbours who can't manage the stairs with full bags.", pricePoints: 10, priceUnit: "TOTAL", availability: "Fridays", tags: ["shopping", "help", "neighbours"], estimatedMinutes: 60, presence: "IN_PERSON", createdAt: daysAgo(6) }),
    L("tobias", "frankfurt", { type: "OFFER", kind: "SERVICE", categoryId: cat("consulting"), title: "CV & Application Review", description: "I hire people for a living. Send me your CV and I'll tell you honestly what a recruiter sees in the first 8 seconds.", pricePoints: 20, priceUnit: "TOTAL", availability: "Flexible", tags: ["cv", "career", "consulting"], estimatedMinutes: 45, presence: "REMOTE", createdAt: daysAgo(5) }),

    // ---- requests (8)
    L("tobias", "frankfurt", { type: "REQUEST", kind: "SERVICE", categoryId: cat("home-diy"), title: "Need help assembling a wardrobe", description: "A three-door wardrobe arrived in six boxes. I have the tools, I do not have the patience or a second pair of hands.", pricePoints: 20, priceUnit: "TOTAL", availability: "Next weekend", tags: ["assembly", "wardrobe"], estimatedMinutes: 120, presence: "IN_PERSON", createdAt: daysAgo(11) }),
    L("anna", "offenbach", { type: "REQUEST", kind: "PRODUCT", categoryId: cat("garden"), title: "Looking for a garden shredder", description: "We pruned the hedge and now have a mountain of branches. Would borrow a shredder for one afternoon.", pricePoints: 12, priceUnit: "PER_DAY", availability: "Any Saturday", tags: ["shredder", "garden"], loanDurationDays: 1, handover: "PICKUP", createdAt: daysAgo(8) }),
    L("lena", "mainz", { type: "REQUEST", kind: "PRODUCT", categoryId: cat("party-events"), title: "Wanted: gazebo for a garden party", description: "3x3 m gazebo for a birthday on the 14th. Rain is forecast, naturally.", pricePoints: 18, priceUnit: "PER_WEEKEND", availability: "Weekend of the 14th", tags: ["gazebo", "party"], loanDurationDays: 3, handover: "PICKUP", createdAt: daysAgo(4) }),
    L("jonas", "wiesbaden", { type: "REQUEST", kind: "SERVICE", categoryId: cat("garden-service"), title: "Someone to mow a large lawn", description: "About 600 m², slightly overgrown. Mower and petrol provided, I just can't do it with my back right now.", pricePoints: 25, priceUnit: "TOTAL", availability: "Weekday mornings", tags: ["lawn", "mowing"], estimatedMinutes: 120, presence: "IN_PERSON", createdAt: daysAgo(7) }),
    L("mira", "badhomburg", { type: "REQUEST", kind: "SERVICE", categoryId: cat("transport"), title: "Help moving a sofa on Saturday", description: "Second floor, no lift, one sofa. Two people and half an hour should do it.", pricePoints: 22, priceUnit: "TOTAL", availability: "Saturday morning", tags: ["moving", "sofa"], estimatedMinutes: 60, presence: "IN_PERSON", createdAt: daysAgo(3) }),
    L("david", "offenbach", { type: "REQUEST", kind: "PRODUCT", categoryId: cat("tools"), title: "Need a tile cutter for one weekend", description: "Retiling the bathroom. Manual or electric, either is fine.", pricePoints: 14, priceUnit: "PER_WEEKEND", availability: "Any weekend in the next month", tags: ["tiles", "bathroom"], loanDurationDays: 3, handover: "PICKUP", createdAt: daysAgo(2) }),
    L("sofia", "sachsenhausen", { type: "REQUEST", kind: "SERVICE", categoryId: cat("it-tech"), title: "Looking for someone to set up a website", description: "Small one-page site for my cooking classes. Nothing fancy, just clean and working.", pricePoints: 45, priceUnit: "TOTAL", availability: "Flexible", tags: ["website", "it"], estimatedMinutes: 240, presence: "REMOTE", createdAt: daysAgo(1) }),
    L("mark", "bornheim", { type: "REQUEST", kind: "SERVICE", categoryId: cat("pets"), title: "Cat sitter needed for a week in October", description: "One very independent cat. Feeding, fresh water and ten minutes of attention a day.", pricePoints: 35, priceUnit: "TOTAL", availability: "Week of 12 October", tags: ["cat", "sitting"], estimatedMinutes: 30, presence: "IN_PERSON", createdAt: hoursAgo(20) }),
  ];

  const listingRows = await db.insert(schema.listings).values(listingSeeds).returning();
  const listing = (title: string) => {
    const found = listingRows.find((l) => l.title === title);
    if (!found) throw new Error(`Unknown listing ${title}`);
    return found;
  };
  console.log(`→ ${listingRows.length} listings`);

  /* --------------------------------------------------- conversations */
  async function conversation(listingId: string | null, a: string, b: string, msgs: [string, string, Date][]) {
    const [conv] = await db
      .insert(schema.conversations)
      .values({ listingId, createdAt: msgs[0]![2], lastMessageAt: msgs[msgs.length - 1]![2] })
      .returning();
    await db.insert(schema.conversationMembers).values([
      { conversationId: conv!.id, userId: a, lastReadAt: new Date() },
      { conversationId: conv!.id, userId: b, lastReadAt: msgs[0]![2] },
    ]);
    await db.insert(schema.messages).values(
      msgs.map(([senderId, body, createdAt]) => ({ conversationId: conv!.id, senderId, body, createdAt })),
    );
    return conv!;
  }

  const convWasher = await conversation(listing("Bosch Pressure Washer").id, id.tobias!, id.anna!, [
    [id.anna!, "Hi Tobias! Is the pressure washer free this Saturday? Our patio has gone properly green.", hoursAgo(30)],
    [id.tobias!, "Hi Anna — Saturday works. You can pick it up any time after 10.", hoursAgo(28)],
    [id.anna!, "Perfect, I'll be there around 11. Thank you!", hoursAgo(27)],
  ]);

  const convWardrobe = await conversation(listing("Need help assembling a wardrobe").id, id.tobias!, id.mark!, [
    [id.mark!, "Saw your wardrobe post. Six boxes is a two-hour job with two people. I'm free Sunday.", daysAgo(10)],
    [id.tobias!, "That would save my weekend. Sunday from 14:00?", daysAgo(10)],
    [id.mark!, "Works for me. I'll bring my own drill.", daysAgo(10)],
  ]);

  const convGarden = await conversation(listing("Garden Help & Planting").id, id.sofia!, id.jonas!, [
    [id.jonas!, "Hi Sofia, my back garden needs rescuing before the autumn. Do you have a free weekend?", daysAgo(6)],
    [id.sofia!, "I do! How big is it roughly?", daysAgo(6)],
    [id.jonas!, "About 60 m², mostly weeds at this point. Honesty is the best policy.", daysAgo(5)],
  ]);

  const convBeamer = await conversation(listing("Full-HD Beamer + Screen").id, id.lena!, id.david!, [
    [id.david!, "Is the beamer free next Friday? Garden cinema for my daughter's birthday.", hoursAgo(5)],
    [id.lena!, "Should be — let me double-check tonight and come back to you.", hoursAgo(4)],
  ]);

  await conversation(listing("English Conversation Practice").id, id.mira!, id.anna!, [
    [id.anna!, "Hi Mira! I'd like to brush up my English before a job interview. Are you taking new people?", hoursAgo(2)],
  ]);

  /* ---------------------------------------------------------- swaps */
  type SwapSeed = {
    listingTitle: string;
    provider: string;
    requester: string;
    conversationId?: string;
    points: number;
    status: (typeof schema.swapStatus.enumValues)[number];
    note?: string;
    scheduledFor?: string;
    createdAt: Date;
    completedAt?: Date;
    reviews?: { author: string; subject: string; rating: number; comment: string }[];
  };

  const swapSeeds: SwapSeed[] = [
    { listingTitle: "Bosch Pressure Washer", provider: "tobias", requester: "anna", conversationId: convWasher.id, points: 15, status: "ACTIVE", note: "Picking up Saturday around 11.", scheduledFor: "Saturday, 10:00 – 18:00", createdAt: hoursAgo(26) },
    { listingTitle: "Need help assembling a wardrobe", provider: "mark", requester: "tobias", conversationId: convWardrobe.id, points: 20, status: "COMPLETION_PENDING", note: "Sunday from 14:00.", scheduledFor: "Sunday, 14:00", createdAt: daysAgo(10) },
    { listingTitle: "Garden Help & Planting", provider: "sofia", requester: "jonas", conversationId: convGarden.id, points: 25, status: "ACCEPTED", note: "Roughly 60 m², mostly weeding.", scheduledFor: "Saturday morning", createdAt: daysAgo(5) },
    { listingTitle: "Full-HD Beamer + Screen", provider: "lena", requester: "david", conversationId: convBeamer.id, points: 18, status: "REQUESTED", note: "Friday evening for a birthday.", scheduledFor: "Friday, 18:00 – 23:00", createdAt: hoursAgo(4) },

    { listingTitle: "Cordless Drill + Bit Set", provider: "tobias", requester: "mira", points: 8, status: "COMPLETED", createdAt: daysAgo(18), completedAt: daysAgo(16), reviews: [ { author: "mira", subject: "tobias", rating: 5, comment: "Batteries fully charged, bits all there. Handover took two minutes." }, { author: "tobias", subject: "mira", rating: 5, comment: "Returned early and cleaner than I lent it." } ] },
    { listingTitle: "Folding Party Tables & Benches", provider: "mark", requester: "lena", points: 20, status: "COMPLETED", createdAt: daysAgo(26), completedAt: daysAgo(23), reviews: [ { author: "lena", subject: "mark", rating: 5, comment: "Saved our garden party. Mark even helped load them into the car." }, { author: "mark", subject: "lena", rating: 5, comment: "Straightforward, friendly, on time." } ] },
    { listingTitle: "IT Support & Computer Rescue", provider: "jonas", requester: "anna", points: 20, status: "COMPLETED", createdAt: daysAgo(20), completedAt: daysAgo(19), reviews: [ { author: "anna", subject: "jonas", rating: 5, comment: "My laptop boots in 20 seconds instead of five minutes. Wizardry." }, { author: "jonas", subject: "anna", rating: 5, comment: "Clear description of the problem, which makes my life much easier." } ] },
    { listingTitle: "Dog Sitting (Weekends)", provider: "anna", requester: "lena", points: 20, status: "COMPLETED", createdAt: daysAgo(15), completedAt: daysAgo(13), reviews: [ { author: "lena", subject: "anna", rating: 5, comment: "Bruno came back happy and exhausted. Photo updates all weekend." }, { author: "anna", subject: "lena", rating: 5, comment: "Lovely dog, everything organised in advance." } ] },
    { listingTitle: "Furniture Assembly", provider: "mark", requester: "sofia", points: 30, status: "COMPLETED", createdAt: daysAgo(30), completedAt: daysAgo(29), reviews: [ { author: "sofia", subject: "mark", rating: 5, comment: "Two hours and my kitchen shelf is straight for the first time ever." }, { author: "mark", subject: "sofia", rating: 5, comment: "Coffee and fresh focaccia. Best payment on top of the points." } ] },
    { listingTitle: "Transport Help with Van", provider: "david", requester: "mira", points: 30, status: "COMPLETED", createdAt: daysAgo(12), completedAt: daysAgo(11), reviews: [ { author: "mira", subject: "david", rating: 4, comment: "Great help, arrived 20 minutes late but stayed until everything was in." }, { author: "david", subject: "mira", rating: 5, comment: "Everything packed and ready when I arrived." } ] },
    { listingTitle: "Italian Conversation Hour", provider: "sofia", requester: "tobias", points: 12, status: "COMPLETED", createdAt: daysAgo(9), completedAt: daysAgo(9), reviews: [ { author: "tobias", subject: "sofia", rating: 5, comment: "An hour of actual conversation, not a textbook in sight. Booking again." }, { author: "sofia", subject: "tobias", rating: 5, comment: "Brave with the subjunctive. Respect." } ] },
    { listingTitle: "Petrol Lawn Mower", provider: "mark", requester: "jonas", points: 12, status: "COMPLETED", createdAt: daysAgo(22), completedAt: daysAgo(21), reviews: [ { author: "jonas", subject: "mark", rating: 5, comment: "Started first pull. Tank was full, which was a nice touch." } ] },
    { listingTitle: "Two-Person Camping Tent", provider: "lena", requester: "david", points: 14, status: "COMPLETED", createdAt: daysAgo(24), completedAt: daysAgo(20), reviews: [ { author: "david", subject: "lena", rating: 5, comment: "Bone dry through two nights of rain." } ] },
    { listingTitle: "Maths Tutoring (Years 5–10)", provider: "anna", requester: "mira", points: 18, status: "COMPLETED", createdAt: daysAgo(6), completedAt: daysAgo(6), reviews: [ { author: "mira", subject: "anna", rating: 5, comment: "Explained in ten minutes what school failed to explain in a term." } ] },
    { listingTitle: "Bicycle Child Trailer", provider: "anna", requester: "sofia", points: 12, status: "COMPLETED", createdAt: daysAgo(14), completedAt: daysAgo(12) },
    { listingTitle: "Pasta Machine (Marcato)", provider: "sofia", requester: "lena", points: 6, status: "COMPLETED", createdAt: daysAgo(13), completedAt: daysAgo(12) },
    { listingTitle: "Portable PA Speaker", provider: "jonas", requester: "mark", points: 22, status: "COMPLETED", createdAt: daysAgo(28), completedAt: daysAgo(26) },
    { listingTitle: "CV & Application Review", provider: "tobias", requester: "david", points: 20, status: "COMPLETED", createdAt: daysAgo(4), completedAt: daysAgo(4), reviews: [ { author: "david", subject: "tobias", rating: 5, comment: "Blunt, specific, and completely right. Rewrote the whole thing." } ] },
    { listingTitle: "Aluminium Ladder 4 m", provider: "mark", requester: "tobias", points: 6, status: "COMPLETED", createdAt: daysAgo(16), completedAt: daysAgo(15) },
    { listingTitle: "Cargo Bike (Long John)", provider: "david", requester: "anna", points: 18, status: "COMPLETED", createdAt: daysAgo(17), completedAt: daysAgo(16), reviews: [ { author: "anna", subject: "david", rating: 5, comment: "Did the whole weekly shop by bike. Slightly life-changing." } ] },
    { listingTitle: "Electric Hedge Trimmer", provider: "sofia", requester: "mark", points: 9, status: "COMPLETED", createdAt: daysAgo(19), completedAt: daysAgo(18) },
    { listingTitle: "English Conversation Practice", provider: "mira", requester: "jonas", points: 15, status: "COMPLETED", createdAt: daysAgo(21), completedAt: daysAgo(20), reviews: [ { author: "jonas", subject: "mira", rating: 5, comment: "Patient, funny, and she actually corrects you instead of nodding along." } ] },
    { listingTitle: "Shopping Assistance", provider: "mira", requester: "david", points: 10, status: "COMPLETED", createdAt: daysAgo(15), completedAt: daysAgo(14), reviews: [ { author: "david", subject: "mira", rating: 5, comment: "Carried four bags up to the third floor without being asked. " } ] },
    { listingTitle: "Ski Set 165 cm + Boots 39", provider: "mira", requester: "lena", points: 16, status: "CANCELLED", note: "Trip fell through, sorry!", createdAt: daysAgo(21) },
    { listingTitle: "Canon DSLR with 50mm Lens", provider: "lena", requester: "jonas", points: 25, status: "DECLINED", note: "Already promised to someone else that weekend.", createdAt: daysAgo(10) },
  ];

  // Replay the swaps in chronological order so no wallet ever dips below zero
  // mid-history — exactly as it would have happened in real usage.
  const swapTimeline = [...swapSeeds].sort(
    (a, b) => (a.completedAt ?? a.createdAt).getTime() - (b.completedAt ?? b.createdAt).getTime(),
  );

  for (const s of swapTimeline) {
    const l = listing(s.listingTitle);
    const [swap] = await db
      .insert(schema.swaps)
      .values({
        listingId: l.id,
        providerId: id[s.provider]!,
        requesterId: id[s.requester]!,
        conversationId: s.conversationId ?? null,
        points: s.points,
        status: s.status,
        note: s.note ?? null,
        scheduledFor: s.scheduledFor ?? null,
        createdAt: s.createdAt,
        providerConfirmedAt: s.status === "COMPLETED" ? s.completedAt : s.status === "COMPLETION_PENDING" ? daysAgo(1) : null,
        requesterConfirmedAt: s.status === "COMPLETED" ? s.completedAt : null,
        completedAt: s.status === "COMPLETED" ? s.completedAt : null,
        closedAt: s.status === "CANCELLED" || s.status === "DECLINED" ? s.createdAt : null,
      })
      .returning();

    if (s.status === "COMPLETED") {
      await db.insert(schema.walletTransactions).values([
        { userId: id[s.requester]!, swapId: swap!.id, type: "SWAP_SPENT", amount: -s.points, description: l.title, createdAt: s.completedAt! },
        { userId: id[s.provider]!, swapId: swap!.id, type: "SWAP_EARNED", amount: s.points, description: l.title, createdAt: s.completedAt! },
      ]);
      await db.update(schema.wallets).set({ balance: sql`${schema.wallets.balance} - ${s.points}` }).where(sql`${schema.wallets.userId} = ${id[s.requester]!}`);
      await db.update(schema.wallets).set({ balance: sql`${schema.wallets.balance} + ${s.points}` }).where(sql`${schema.wallets.userId} = ${id[s.provider]!}`);
    }

    for (const r of s.reviews ?? []) {
      await db.insert(schema.reviews).values({
        swapId: swap!.id,
        authorId: id[r.author]!,
        subjectId: id[r.subject]!,
        rating: r.rating,
        comment: r.comment,
        createdAt: s.completedAt ?? s.createdAt,
      });
    }
  }
  console.log(`→ ${swapSeeds.length} swaps`);

  /* -------------------------------------------------------- swoppies */
  const swoppyPairs: [string, string][] = [
    ["tobias", "anna"], ["tobias", "mark"], ["tobias", "sofia"], ["tobias", "mira"], ["tobias", "david"],
    ["anna", "jonas"], ["anna", "lena"], ["mark", "lena"], ["mark", "sofia"], ["david", "mira"], ["lena", "sofia"],
  ];
  await db.insert(schema.swoppies).values(
    swoppyPairs.flatMap(([a, b]) => [
      { userId: id[a]!, swoppyId: id[b]!, createdAt: daysAgo(10) },
      { userId: id[b]!, swoppyId: id[a]!, createdAt: daysAgo(10) },
    ]),
  );

  /* ---------------------------------------------------------- badges */
  const completedPerUser = new Map<string, number>();
  for (const s of swapSeeds.filter((x) => x.status === "COMPLETED")) {
    completedPerUser.set(s.provider, (completedPerUser.get(s.provider) ?? 0) + 1);
    completedPerUser.set(s.requester, (completedPerUser.get(s.requester) ?? 0) + 1);
  }
  const badgeValues = [];
  for (const [key, count] of completedPerUser) {
    for (const def of BADGE_DEFINITIONS) {
      if (count >= def.swapThreshold) {
        badgeValues.push({ userId: id[key]!, badgeId: badge(def.slug), awardedAt: daysAgo(5) });
      }
    }
  }
  if (badgeValues.length) await db.insert(schema.userBadges).values(badgeValues);

  /* --------------------------------------------------- notifications */
  await db.insert(schema.notifications).values([
    { userId: id.tobias!, type: "MESSAGE", title: "Anna Weber sent you a message", body: "Perfect, I'll be there around 11. Thank you!", link: `/messages/${convWasher.id}`, createdAt: hoursAgo(27) },
    { userId: id.tobias!, type: "SWAP_COMPLETION_REQUESTED", title: "Mark Fischer marked a Swop as done", body: "Need help assembling a wardrobe — confirm to release 20 SP.", link: "/swaps", createdAt: daysAgo(1) },
    { userId: id.tobias!, type: "POINTS_RECEIVED", title: "You earned 20 SP", body: "CV & Application Review with Colin Richter.", link: "/wallet", readAt: daysAgo(3), createdAt: daysAgo(4) },
    { userId: id.lena!, type: "SWAP_REQUESTED", title: "Colin Richter wants to Swop", body: "Full-HD Beamer + Screen — 18 SP", link: "/swaps", createdAt: hoursAgo(4) },
    { userId: id.anna!, type: "SWAP_ACCEPTED", title: "Tobias Theis accepted your request", body: "Bosch Pressure Washer — 15 SP", link: "/swaps", createdAt: hoursAgo(26) },
  ]);

  /* ------------------------------------------------------- feedback */
  await db.insert(schema.feedback).values([
    { userId: id.anna!, type: "IDEA", message: "It would be great to see which of my Swoppies already borrowed something, as a kind of recommendation.", createdAt: daysAgo(5) },
    { userId: id.david!, type: "BUG", message: "On my phone the distance filter sometimes needs two taps before it applies.", createdAt: daysAgo(2) },
    { userId: id.mira!, type: "FEEDBACK", message: "Honestly the welcome bonus is what made me try it. Without 50 SP I would have just browsed and left.", createdAt: daysAgo(1) },
  ]);

  /* -------------------------------------------------------- reports */
  await db.insert(schema.reports).values([
    { reporterId: id.jonas!, targetType: "LISTING", targetId: listing("Ski Set 165 cm + Boots 39").id, reason: "INCORRECT_INFORMATION", details: "Description says boots size 39 but the photo looks like a much larger boot.", createdAt: daysAgo(3) },
  ]);

  /* -------------------------------- top the demo account up to 145 SP */
  const [demoWallet] = await db.select().from(schema.wallets).where(sql`${schema.wallets.userId} = ${id.tobias!}`);
  const topUp = 145 - (demoWallet?.balance ?? 0);
  if (topUp !== 0) {
    await db.insert(schema.walletTransactions).values({
      userId: id.tobias!,
      type: "BONUS",
      amount: topUp,
      description: "FirstMover community bonus",
      createdAt: daysAgo(2),
    });
    await db.update(schema.wallets).set({ balance: sql`${schema.wallets.balance} + ${topUp}` }).where(sql`${schema.wallets.userId} = ${id.tobias!}`);
  }

  /* ------------------------------------------------- integrity check */
  const check = await db.execute(sql`
    SELECT w.user_id, w.balance, COALESCE(SUM(t.amount), 0)::int AS ledger
    FROM wallets w LEFT JOIN wallet_transactions t ON t.user_id = w.user_id
    GROUP BY w.user_id, w.balance
    HAVING w.balance <> COALESCE(SUM(t.amount), 0)::int
  `);
  if (check.rows.length) {
    throw new Error(`Ledger mismatch for ${check.rows.length} wallet(s)`);
  }

  const balances = await db.execute(sql`
    SELECT p.display_name, w.balance FROM wallets w
    JOIN profiles p ON p.user_id = w.user_id ORDER BY w.balance DESC
  `);
  console.log("→ Wallets:", balances.rows.map((r) => `${r.display_name}: ${r.balance} SP`).join(", "));
  console.log(`\n✓ Seed complete. Log in with any of these and the password "${PASSWORD}":`);
  console.log("  demo@swop-it.local   (Tobias, 145 SP — the demo account)");
  console.log("  anna@swop-it.local   (Anna)");
  console.log("  admin@swop-it.local  (admin dashboard)");

  await close();
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  main().catch((error) => reportDatabaseUnavailable(error, "load the demo data"));
}
