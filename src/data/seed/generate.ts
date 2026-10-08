import type {
  AdDay,
  BankTxn,
  Bill,
  Customer,
  Invoice,
  Lead,
  Message,
  Order,
  OrderLine,
  Product,
  Shipment,
  Source,
  Subscription,
  Ticket,
  TrafficDay,
  World,
} from "@/types";
import { World as WorldSchema } from "@/types";
import { addDays, daysBetween, weekday } from "@/engine/windows";
import { diffuser, mulberry32, type Rng } from "./rng";
import { PLANT, STORIES } from "./stories";

// The seed world generator (docs/DATA-MODEL.md, section 4). Pure: same seed and day0, same world.
// Order of operations: business + products → customers → demand curves → ad days + traffic →
// orders → shipments → tickets → leads + messages → wholesale orders + invoices → bills +
// subscriptions → bank txns → stories (events, obligations, planted records) → validate.

export type GenerateOptions = { seed: number; day0: string; days?: number; generatedAt?: string };

const DAYS = 90;
const REGIONS = ["NCR", "West", "South", "North", "East"] as const;
type Region = (typeof REGIONS)[number];
const REGION_WEIGHTS = [0.17, 0.3, 0.28, 0.14, 0.11];
const CITIES: Record<Region, string[]> = {
  NCR: ["New Delhi", "Gurugram", "Noida", "Ghaziabad", "Faridabad"],
  West: ["Mumbai", "Pune", "Ahmedabad", "Surat", "Nagpur", "Goa"],
  South: ["Bengaluru", "Chennai", "Hyderabad", "Kochi", "Coimbatore", "Mysuru"],
  North: ["Jaipur", "Lucknow", "Chandigarh", "Dehradun", "Udaipur"],
  East: ["Kolkata", "Bhubaneswar", "Guwahati", "Patna", "Ranchi"],
};
const COURIER: Record<Region, string> = { NCR: "Delhivery", West: "Blue Dart", South: "Delhivery", North: "DTDC", East: "Ecom Express" };
const PROMISE_DAYS: Record<Region, number> = { NCR: 2, West: 3, South: 3, North: 2, East: 4 };
const DELAY_MEAN: Record<Region, number> = { NCR: 1.2, West: 0.8, South: 0.9, North: 0.7, East: 1.1 };

const FIRST = [
  "Ananya", "Priya", "Meera", "Kavya", "Riya", "Sneha", "Pooja", "Neha", "Divya", "Aarti", "Shreya", "Nisha", "Isha", "Tanvi", "Radhika",
  "Aditi", "Swati", "Megha", "Ritu", "Anjali", "Lakshmi", "Deepa", "Sunita", "Rekha", "Nandini", "Bhavna", "Kiran", "Payal", "Ruchi", "Sakshi",
  "Rahul", "Amit", "Rohan", "Arjun", "Vikram", "Karan", "Siddharth", "Nikhil", "Aakash", "Varun", "Manish", "Suresh", "Rajesh", "Deepak", "Sanjay",
  "Harish", "Anil", "Gaurav", "Abhishek", "Vivek", "Sameer", "Rohit", "Ajay", "Mohit", "Pranav", "Tarun", "Yash", "Kunal", "Ishaan", "Dev",
];
const SURNAME: Record<Region, string[]> = {
  NCR: ["Sharma", "Gupta", "Malhotra", "Kapoor", "Chopra", "Bansal", "Aggarwal", "Khanna", "Sethi", "Mehra", "Bhatia", "Arora"],
  West: ["Patel", "Shah", "Desai", "Kulkarni", "Joshi", "Deshpande", "Mehta", "Parikh", "Naik", "Fernandes", "Gandhi", "Jadhav"],
  South: ["Iyer", "Nair", "Reddy", "Menon", "Krishnan", "Rao", "Pillai", "Srinivasan", "Hegde", "Shetty", "Subramaniam", "Varghese"],
  North: ["Singh", "Rathore", "Chauhan", "Saxena", "Verma", "Tiwari", "Mishra", "Yadav", "Bisht", "Negi", "Sodhi", "Gill"],
  East: ["Banerjee", "Chatterjee", "Das", "Mukherjee", "Sen", "Ghosh", "Mohanty", "Bose", "Roy", "Dutta", "Sinha", "Choudhury"],
};

type ProductSpec = { sku: string; name: string; category: Product["category"]; cost: number; w: number; wholesaleW: number; supplier: string; lead: number };
const PRODUCTS: ProductSpec[] = [
  { sku: "CER-MUG4", name: "Indigo Stoneware Mug (set of 4)", category: "ceramics", cost: 580, w: 16.95, wholesaleW: 3, supplier: "Neelam Blue Pottery, Sanganer", lead: 18 },
  { sku: "CER-BOWL", name: "Blue Pottery Serving Bowl", category: "ceramics", cost: 740, w: 4.47, wholesaleW: 5, supplier: "Neelam Blue Pottery, Sanganer", lead: 18 },
  { sku: "CER-VASE", name: "Jaipur Blue Pottery Vase", category: "ceramics", cost: 960, w: 2.99, wholesaleW: 4, supplier: "Neelam Blue Pottery, Sanganer", lead: 18 },
  { sku: "CER-PLNT3", name: "Terracotta Planter (set of 3)", category: "ceramics", cost: 440, w: 10.01, wholesaleW: 4, supplier: "Rajesh Kumhar & Sons, Ramgarh", lead: 14 },
  { sku: "CER-PLT6", name: "Stoneware Dinner Plate (set of 6)", category: "ceramics", cost: 1280, w: 1.91, wholesaleW: 3, supplier: "Neelam Blue Pottery, Sanganer", lead: 21 },
  { sku: "CER-COAST", name: "Hand-painted Coasters (set of 6)", category: "ceramics", cost: 220, w: 29.31, wholesaleW: 7, supplier: "Neelam Blue Pottery, Sanganer", lead: 12 },
  { sku: "CER-DIYA12", name: "Ceramic Diya (set of 12)", category: "ceramics", cost: 180, w: 40.0, wholesaleW: 8, supplier: "Rajesh Kumhar & Sons, Ramgarh", lead: 10 },
  { sku: "CER-JUG", name: "Matka Water Jug", category: "ceramics", cost: 540, w: 7.29, wholesaleW: 2, supplier: "Rajesh Kumhar & Sons, Ramgarh", lead: 14 },
  { sku: "LIN-RUN", name: "Block-print Table Runner", category: "linen", cost: 340, w: 14.93, wholesaleW: 6, supplier: "Bagru Textiles Co-op", lead: 12 },
  { sku: "LIN-CUSH2", name: "Sanganeri Cushion Cover (set of 2)", category: "linen", cost: 500, w: 8.21, wholesaleW: 7, supplier: "Sanganer Block Print House", lead: 12 },
  { sku: "LIN-NAP6", name: "Linen Napkin (set of 6)", category: "linen", cost: 300, w: 18.12, wholesaleW: 6, supplier: "Bagru Textiles Co-op", lead: 10 },
  { sku: "LIN-RAZAI", name: "Jaipur Razai (single)", category: "linen", cost: 1520, w: 1.47, wholesaleW: 2, supplier: "Sanganer Block Print House", lead: 21 },
  { sku: "LIN-BED", name: "Bagru Bedsheet (king)", category: "linen", cost: 1160, w: 2.23, wholesaleW: 3, supplier: "Bagru Textiles Co-op", lead: 16 },
  { sku: "LIN-TOWEL3", name: "Indigo Tea Towel (set of 3)", category: "linen", cost: 200, w: 33.97, wholesaleW: 6, supplier: "Bagru Textiles Co-op", lead: 10 },
  { sku: "LIN-CLOTH", name: "Block-print Tablecloth", category: "linen", cost: 780, w: 4.12, wholesaleW: 3, supplier: "Sanganer Block Print House", lead: 14 },
  { sku: "LIN-APRON", name: "Linen Apron", category: "linen", cost: 260, w: 22.62, wholesaleW: 3, supplier: "Bagru Textiles Co-op", lead: 10 },
  { sku: "LGT-LANT-S", name: "Brass Lantern (small)", category: "lighting", cost: 660, w: 5.34, wholesaleW: 5, supplier: "Moradabad Brassworks", lead: 21 },
  { sku: "LGT-LANT-L", name: "Brass Lantern (large)", category: "lighting", cost: 1120, w: 2.35, wholesaleW: 2, supplier: "Moradabad Brassworks", lead: 21 },
  { sku: "LGT-SHADE", name: "Paper Lamp Shade", category: "lighting", cost: 480, w: 8.75, wholesaleW: 4, supplier: "Kagzi Paper Studio, Sanganer", lead: 12 },
  { sku: "LGT-CANE", name: "Cane Pendant Light", category: "lighting", cost: 1360, w: 1.74, wholesaleW: 2, supplier: "Moradabad Brassworks", lead: 21 },
  { sku: "LGT-JAALI4", name: "Jaali Tealight Holder (set of 4)", category: "lighting", cost: 320, w: 16.4, wholesaleW: 6, supplier: "Moradabad Brassworks", lead: 16 },
  { sku: "LGT-DIYAST", name: "Hanging Diya Stand", category: "lighting", cost: 580, w: 6.52, wholesaleW: 3, supplier: "Moradabad Brassworks", lead: 16 },
  { sku: "LGT-LAMP", name: "Ceramic Table Lamp", category: "lighting", cost: 1680, w: 1.25, wholesaleW: 1, supplier: "Neelam Blue Pottery, Sanganer", lead: 21 },
  { sku: "LGT-STRING", name: "Festive String Lights", category: "lighting", cost: 220, w: 29.31, wholesaleW: 5, supplier: "Kagzi Paper Studio, Sanganer", lead: 10 },
];

const WHOLESALE_SHOPS: { shop: string; city: string; contact: string }[] = [
  { shop: "Tulsi Living", city: "Pune", contact: "Priya Kulkarni" },
  { shop: "The Courtyard Store", city: "Bengaluru", contact: "Nikhil Rao" },
  { shop: "Mitti & More", city: "Hyderabad", contact: "Sunita Reddy" },
  { shop: "Casa Bohème", city: "Goa", contact: "Natasha Fernandes" },
  { shop: "Nilgiri Homes", city: "Coimbatore", contact: "Arun Krishnan" },
  { shop: "Amaltas Decor", city: "Lucknow", contact: "Shalini Saxena" },
  { shop: "Dastkar Haat", city: "Kolkata", contact: "Rupa Banerjee" },
  { shop: "Aranya Living", city: "Mumbai", contact: "Kabir Mehta" },
  { shop: "Dhara Home", city: "Chennai", contact: "Lakshmi Iyer" },
  { shop: "Kutumb Store", city: "Ahmedabad", contact: "Hetal Shah" },
  { shop: "Banyan & Birch", city: "Gurugram", contact: "Ritika Malhotra" },
  { shop: "Ghar Pe", city: "Noida", contact: "Sameer Bansal" },
  { shop: "Patra Studio", city: "Kochi", contact: "Anju Varghese" },
  { shop: "Roohani Home", city: "Chandigarh", contact: "Gurpreet Gill" },
  { shop: "Jharokha", city: "Udaipur", contact: "Vikram Rathore" },
  { shop: "Neem Tree Store", city: "Mysuru", contact: "Deepa Hegde" },
  { shop: "Urban Angan", city: "Indore", contact: "Manish Jain" },
  { shop: "Kaarigari Collective", city: "Bhopal", contact: "Pooja Tiwari" },
  { shop: "Sona Home", city: "Surat", contact: "Jignesh Patel" },
  { shop: "The Verandah", city: "Dehradun", contact: "Aditi Negi" },
  { shop: "Haldi & Co", city: "Nagpur", contact: "Prachi Deshpande" },
  { shop: "Ikat House", city: "Bhubaneswar", contact: "Sambit Mohanty" },
  { shop: "Kalpa Living", city: "Guwahati", contact: "Nandini Das" },
  { shop: "Zaroori", city: "Faridabad", contact: "Tarun Aggarwal" },
  { shop: "Studio Mishri", city: "New Delhi", contact: "Kavya Khanna" },
  { shop: "Oak & Clay", city: "Pune", contact: "Rohan Joshi" },
  { shop: "Pind Decor", city: "Ludhiana", contact: "Harpreet Sodhi" },
  { shop: "Maati Ghar", city: "Patna", contact: "Rekha Sinha" },
  { shop: "Chaitra Stores", city: "Chennai", contact: "Karthik Srinivasan" },
  { shop: "Baithak", city: "Jaipur", contact: "Meenakshi Chauhan" },
  { shop: "The Linen Room", city: "Mumbai", contact: "Zoya Parikh" },
  { shop: "Sutra Home", city: "Hyderabad", contact: "Srikanth Rao" },
  { shop: "Anand Emporium", city: "Ranchi", contact: "Anand Choudhury" },
  { shop: "Varnam", city: "Bengaluru", contact: "Shruti Shetty" },
  { shop: "Deva Handicrafts", city: "Varanasi", contact: "Devesh Mishra" },
  { shop: "Kesar Living", city: "Ahmedabad", contact: "Nehal Desai" },
  { shop: "Agni Lights", city: "Kolkata", contact: "Arnab Ghosh" },
  { shop: "Saanjh Decor", city: "Jodhpur", contact: "Pallavi Bisht" },
  { shop: "Ratan Home Store", city: "Nashik", contact: "Rakesh Naik" },
];

const S1_LEADS: { shop: string; city: string; contact: string; est: number; channel: Lead["channel"]; ask: string; qty: string; question: string; hoursAgo: number }[] = [
  { shop: "Tulsi Living", city: "Pune", contact: "Priya Kulkarni", est: 45_000, channel: "whatsapp", ask: "Indigo Stoneware Mug sets and Sanganeri cushion covers for the Diwali window", qty: "40 mug sets and 30 cushion sets", question: "Can you do 60 mug sets instead of 40 if we take two colourways?", hoursAgo: 52 },
  { shop: "The Courtyard Store", city: "Bengaluru", contact: "Nikhil Rao", est: 38_000, channel: "email", ask: "brass lanterns and jaali tealight holders for a festive display", qty: "25 small lanterns, 10 large, 30 jaali sets", question: "Is the quote inclusive of GST and freight to Bengaluru?", hoursAgo: 61 },
  { shop: "Mitti & More", city: "Hyderabad", contact: "Sunita Reddy", est: 31_000, channel: "whatsapp", ask: "blue pottery serving bowls and vases", qty: "20 bowls and 12 vases", question: "Can we get two sample bowls before confirming the full order?", hoursAgo: 75 },
  { shop: "Casa Bohème", city: "Goa", contact: "Natasha Fernandes", est: 26_000, channel: "email", ask: "block-print table runners and napkin sets for the restaurant line", qty: "30 runners and 20 napkin sets", question: "Do you have the runners in the mustard colourway, and what is the lead time?", hoursAgo: 88 },
  { shop: "Nilgiri Homes", city: "Coimbatore", contact: "Arun Krishnan", est: 18_000, channel: "whatsapp", ask: "ceramic diya sets and festive string lights", qty: "40 diya sets and 20 string light boxes", question: "If we confirm today, can it reach Coimbatore before the 20th?", hoursAgo: 96 },
  { shop: "Amaltas Decor", city: "Lucknow", contact: "Shalini Saxena", est: 14_000, channel: "whatsapp", ask: "terracotta planter sets", qty: "16 sets", question: "Is there a discount if we go to 24 sets?", hoursAgo: 110 },
  { shop: "Dastkar Haat", city: "Kolkata", contact: "Rupa Banerjee", est: 12_000, channel: "email", ask: "paper lamp shades for a pop-up", qty: "12 shades", question: "Can the shades ship flat-packed, and will the quote hold till next week?", hoursAgo: 118 },
];

export function generateWorld(opts: GenerateOptions): World {
  const rng = mulberry32(opts.seed);
  const day0 = opts.day0;
  const days = opts.days ?? DAYS;
  const date = (d: number) => addDays(day0, d);
  const dt = (d: number, h: number, m = 0) => `${date(d)}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`;
  const dayOfDate = (iso: string) => daysBetween(day0, iso);
  const today = days - 1;

  const world: World = {
    meta: {
      business: {
        name: "Kaveri Home",
        owner: "Meera Rathore",
        city: "Jaipur",
        gstin: "08AAFCK2719M1Z4",
        staffTotal: 14,
        staffOps: PLANT.s11.staffOps,
        ordersPerPersonPerMonth: PLANT.s11.ordersPerPersonPerMonth,
        festiveLift: PLANT.s11.festiveLift,
        salaryPerHireINR: 18_000,
        cashBufferINR: 2_00_000,
      },
      generatedAt: opts.generatedAt ?? `${date(today)}T07:00:00+05:30`,
      day0,
      days,
      seed: opts.seed,
    },
    sources: [],
    customers: [],
    products: [],
    orders: [],
    shipments: [],
    leads: [],
    messages: [],
    invoices: [],
    bills: [],
    subscriptions: [],
    adDays: [],
    trafficDays: [],
    tickets: [],
    bankTxns: [],
    obligations: [],
    events: [],
    tasks: [],
    purchaseOrders: [],
  };

  // ---- products --------------------------------------------------------------------------
  for (const p of PRODUCTS) {
    world.products.push({
      id: p.sku,
      source: "shopify",
      createdAt: date(0),
      sku: p.sku,
      name: p.name,
      category: p.category,
      unitCost: p.cost,
      price: p.cost * 2.5,
      wholesalePrice: p.cost * 2,
      onHand: 0, // set from velocity below
      leadTimeDays: p.lead,
      supplier: p.supplier,
    });
  }
  const bySku = new Map(world.products.map((p) => [p.sku, p]));

  // ---- wholesale accounts ----------------------------------------------------------------
  const wholesaleIds: string[] = [];
  const addWholesale = (id: string, shop: string, city: string, contact: string, createdDay: number) => {
    const region = regionOfCity(city);
    world.customers.push({
      id,
      source: "zoho-books",
      createdAt: date(createdDay),
      name: shop,
      type: "wholesale",
      city,
      region,
      shop,
      contact,
      email: `${contact.split(" ")[0].toLowerCase()}@${shop.toLowerCase().replace(/[^a-z]/g, "")}.in`,
      phone: phone(rng),
    });
    wholesaleIds.push(id);
  };
  addWholesale(PLANT.s6.customerId, PLANT.s6.shop, PLANT.s6.city, "Anita Krishnan", 0);
  const s1Shops = new Set(S1_LEADS.map((l) => l.shop));
  const s4Shops = ["Aranya Living", "Dhara Home"];
  const existingShops = WHOLESALE_SHOPS.filter((s) => !s1Shops.has(s.shop));
  // 39 existing accounts: the two S4 debtors plus the rest, created before day 0.
  let wi = 2;
  for (const s of existingShops.slice(0, 39)) {
    addWholesale(`w${String(wi).padStart(2, "0")}`, s.shop, s.city, s.contact, 0);
    wi++;
  }

  // ---- demand curves ---------------------------------------------------------------------
  const W = normalise([1.1, 0.94, 0.96, 0.98, 1.0, 1.02, 1.1]); // Sun..Sat
  const dow = (d: number) => weekday(date(d));
  const trend = (d: number) => 1 + 0.02 * (d / 30); // under 3% a month
  const bump = (d: number) => (d >= 18 && d <= 26 ? 1.12 : 1); // monsoon sale, before day 30
  const organic: number[] = [];
  const paidSessions: number[] = [];
  const landingSessions: number[] = [];
  const spendSchedule = (d: number) => (d < PLANT.s2.startDay ? 2150 : 2900);
  const CAMPAIGNS = [
    { name: "Always on: ceramics", share: 0.55 },
    { name: "Linen and bedding", share: 0.45 },
  ];
  const roundOrganic = diffuser();
  const roundLanding = diffuser();
  const campaignRounders = CAMPAIGNS.map(() => diffuser());
  const diwaliRounder = diffuser();
  for (let d = 0; d < days; d++) {
    const o = roundOrganic(400 * trend(d) * W[dow(d)] * bump(d) * rng.noise(0.025));
    organic.push(o);
    let paid = 0;
    CAMPAIGNS.forEach((c, i) => {
      const spend = Math.round(spendSchedule(d) * c.share * rng.noise(0.02));
      const sessions = campaignRounders[i](spend * 0.12 * W[dow(d)] * bump(d) * rng.noise(0.025));
      const clicks = Math.round(sessions * 1.18);
      world.adDays.push({
        id: `ad-${d}-${i}`,
        source: "meta-ads",
        createdAt: date(d),
        date: date(d),
        campaign: c.name,
        status: "active",
        spend,
        impressions: Math.round(clicks * rng.int(38, 46)),
        clicks,
        sessions,
      });
      paid += sessions;
    });
    if (d >= PLANT.s2.startDay) {
      const active = d < PLANT.s2.pauseDay;
      const spend = active ? Math.round(PLANT.s2.spendPerDay * rng.noise(0.02)) : 0;
      const sessions = active ? diwaliRounder(PLANT.s2.sessionsPerDay * W[dow(d)] * rng.noise(0.025)) : 0;
      const clicks = Math.round(sessions * 1.1);
      world.adDays.push({
        id: `ad-${d}-2`,
        source: "meta-ads",
        createdAt: date(d),
        date: date(d),
        campaign: PLANT.s2.campaign,
        status: active ? "active" : "paused",
        spend,
        impressions: active ? Math.round(clicks * rng.int(22, 28)) : 0,
        clicks,
        sessions,
      });
      paid += sessions;
    }
    paidSessions.push(paid);
    const landing = roundLanding(0.18 * (o + paid) * rng.noise(0.02));
    landingSessions.push(landing);
    world.trafficDays.push({ id: `tr-${d}`, source: "shopify", createdAt: date(d), date: date(d), organic: o, landingSessions: landing });
  }

  // ---- D2C orders (purchase lag: 60% of a day's orders come from the previous day's sessions)
  const cvrNonLanding = 0.023;
  const landingCvr = (d: number) => (d < PLANT.s3.day ? PLANT.s3.cvrBefore : PLANT.s3.cvrAfter);
  const expLanding = (d: number) => landingSessions[Math.max(0, d)] * landingCvr(Math.max(0, d));
  const expOther = (d: number) => (organic[Math.max(0, d)] + paidSessions[Math.max(0, d)] - landingSessions[Math.max(0, d)]) * cvrNonLanding;
  const roundL = diffuser();
  const roundO = diffuser();
  const d2cCustomers: { c: Customer; lastOrderDay: number }[] = [];
  let orderSeq = 10_000;
  let custSeq = 1;
  const newCustomer = (d: number): Customer => {
    const region = rng.weighted(REGIONS, REGION_WEIGHTS);
    const c: Customer = {
      id: `c${String(custSeq++).padStart(4, "0")}`,
      source: "shopify",
      createdAt: date(d),
      name: `${rng.pick(FIRST)} ${rng.pick(SURNAME[region])}`,
      type: "d2c",
      city: rng.pick(CITIES[region]),
      region,
    };
    world.customers.push(c);
    return c;
  };
  // Decks instead of independent draws: the product mix and basket size stay steady from one
  // window to the next, so revenue moves with orders rather than with sampling noise.
  const productDeck = deck(rng, PRODUCTS, PRODUCTS.map((x) => x.w), 400);
  const linesDeck = deck(rng, [1, 2, 3], [0.74, 0.22, 0.04], 100);
  const qtyDeck = deck(rng, [1, 2], [0.93, 0.07], 100);
  const d2cLines = (): OrderLine[] => {
    const n = linesDeck();
    const picked = new Set<string>();
    const lines: OrderLine[] = [];
    while (lines.length < n) {
      const p = productDeck();
      if (picked.has(p.sku)) continue;
      picked.add(p.sku);
      lines.push({ sku: p.sku, qty: qtyDeck(), price: p.cost * 2.5 });
    }
    return lines;
  };
  const repeatWindowDays = 60;
  for (let d = 0; d < days; d++) {
    const nL = roundL((0.4 * expLanding(d) + 0.6 * expLanding(d - 1)) * rng.noise(0.025));
    const nO = roundO((0.4 * expOther(d) + 0.6 * expOther(d - 1)) * rng.noise(0.025));
    const flags = rng.shuffle([...Array<boolean>(nL).fill(true), ...Array<boolean>(nO).fill(false)]);
    for (const viaLanding of flags) {
      // 22% of orders come from a customer who ordered in the last 60 days. After the NCR courier
      // change, NCR customers come back less (S5 → repeat rate).
      let customer: Customer | null = null;
      if (rng.next() < 0.22) {
        const pool = d2cCustomers.filter((x) => x.lastOrderDay >= d - repeatWindowDays && x.lastOrderDay < d);
        if (pool.length) {
          const cand = rng.pick(pool);
          const dropped = cand.c.region === PLANT.s5.region && d >= PLANT.s5.day + 6 && rng.next() < 0.6;
          if (!dropped) customer = cand.c;
        }
      }
      let entry = d2cCustomers.find((x) => x.c === customer);
      if (!customer) {
        customer = newCustomer(d);
        entry = { c: customer, lastOrderDay: d };
        d2cCustomers.push(entry);
      } else if (entry) entry.lastOrderDay = d;
      const lines = d2cLines();
      const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
      const id = `KH${orderSeq++}`;
      world.orders.push({ id, source: "shopify", createdAt: date(d), customerId: customer.id, channel: "d2c", lines, total, viaLanding, region: customer.region, status: "fulfilled" });
      // shipment
      const region = customer.region as Region;
      const dispatchDay = d + 1;
      const courier = region === PLANT.s5.region && dispatchDay >= PLANT.s5.day ? PLANT.s5.courierAfter : COURIER[region];
      const mean = region === PLANT.s5.region ? (dispatchDay >= PLANT.s5.day ? PLANT.s5.delayAfter : PLANT.s5.delayBefore) : DELAY_MEAN[region];
      const delay = Math.max(-0.5, mean + 0.4 * rng.gauss());
      const promisedDay = dispatchDay + PROMISE_DAYS[region];
      // Promised by 18:00 on the promised day; delay is measured from then, in days.
      const deliveredHours = promisedDay * 24 + 18 + delay * 24;
      const deliveredDay = Math.floor(deliveredHours / 24);
      const delivered = deliveredDay <= today;
      const hh = Math.floor(deliveredHours % 24);
      const mm = Math.floor(((deliveredHours % 24) - hh) * 60);
      const awb = `SR${String(140_000_000 + orderSeq * 7 + d).padStart(10, "0")}`;
      world.shipments.push({
        id: awb,
        source: "shiprocket",
        createdAt: date(Math.min(dispatchDay, today)),
        orderId: id,
        courier,
        region,
        dispatchedAt: date(dispatchDay),
        promisedAt: dt(promisedDay, 18),
        deliveredAt: delivered ? dt(deliveredDay, hh, mm) : null,
        status: delivered ? "delivered" : "in_transit",
      });
      if (dispatchDay > today) world.orders[world.orders.length - 1].status = "paid";
      // tickets: late deliveries complain; a trickle of quality and other tickets
      if (delivered) {
        const late = delay > 2;
        const pTicket = late ? 0.16 : 0.012;
        if (rng.next() < pTicket) {
          const ticketDay = Math.min(today, deliveredDay + rng.int(0, 2));
          world.tickets.push({
            id: `tk-${world.tickets.length + 1}`,
            source: "freshdesk",
            createdAt: date(ticketDay),
            customerId: customer.id,
            orderId: id,
            category: "delivery",
            sentiment: late ? "negative" : "neutral",
            subject: late ? `Order ${id} delivered ${Math.round(delay)} days late` : `Where is my order ${id}?`,
            status: ticketDay >= today - 3 ? "open" : "resolved",
            region,
          });
        } else if (rng.next() < 0.013) {
          const ticketDay = Math.min(today, deliveredDay + rng.int(1, 4));
          const quality = rng.next() < 0.7;
          world.tickets.push({
            id: `tk-${world.tickets.length + 1}`,
            source: "freshdesk",
            createdAt: date(ticketDay),
            customerId: customer.id,
            orderId: id,
            category: quality ? "quality" : "other",
            sentiment: quality ? "negative" : "neutral",
            subject: quality ? `One piece arrived chipped in order ${id}` : `Invoice copy needed for order ${id}`,
            status: ticketDay >= today - 3 ? "open" : "resolved",
            region,
          });
        }
      }
    }
  }

  // ---- leads + messages ----------------------------------------------------------------
  const leadRound = diffuser();
  let leadSeq = 1;
  let msgSeq = 1;
  const addMessage = (m: Omit<Message, "id" | "source" | "createdAt">): Message => {
    const msg: Message = { id: `m${String(msgSeq++).padStart(4, "0")}`, source: m.channel === "whatsapp" ? "whatsapp" : "gmail", createdAt: m.at, ...m };
    world.messages.push(msg);
    return msg;
  };
  const wonOrders: { lead: Lead; day: number }[] = [];
  const leadShopPool = rng.shuffle(WHOLESALE_SHOPS.filter((s) => !s1Shops.has(s.shop)));
  let poolIdx = 0;
  const nextShop = () => {
    const s = leadShopPool[poolIdx % leadShopPool.length];
    const n = Math.floor(poolIdx / leadShopPool.length);
    poolIdx++;
    return n === 0 ? s : { ...s, shop: `${s.shop} ${["II", "Annexe", "Studio"][n % 3]}` };
  };
  const ownerName = "Meera";
  for (let d = 0; d < days; d++) {
    const n = leadRound((27.8 / 30) * rng.noise(0.1));
    for (let k = 0; k < n; k++) {
      const s = nextShop();
      const channel: Lead["channel"] = rng.next() < 0.6 ? "whatsapp" : "email";
      const est = rng.int(5, 24) * 1000;
      const product = rng.weighted(PRODUCTS, PRODUCTS.map((p) => p.wholesaleW));
      const qty = rng.int(10, 40);
      const id = `L${String(leadSeq++).padStart(3, "0")}`;
      const first = s.contact.split(" ")[0];
      const thread: Message[] = [];
      const h = rng.int(10, 18);
      thread.push(
        addMessage({
          threadId: id,
          channel,
          direction: "in",
          from: s.contact,
          to: ownerName,
          subject: channel === "email" ? `Wholesale enquiry from ${s.shop}, ${s.city}` : undefined,
          body:
            channel === "whatsapp"
              ? `Hi ${ownerName} ji, this is ${first} from ${s.shop} in ${s.city}. We saw your ${product.name.toLowerCase()} on Instagram. Do you supply to stores? We would start with about ${qty}.`
              : `Dear ${ownerName},\n\nWe run ${s.shop} in ${s.city} and would like to stock your ${product.name.toLowerCase()}, about ${qty} units. Could you share wholesale pricing?\n\nRegards,\n${s.contact}`,
          at: dt(d, h),
          leadId: id,
        }),
      );
      const contactedDay = Math.min(today, d + rng.int(0, 1));
      const quotedDay = d + rng.int(2, 4);
      let stage: Lead["stage"] = "contacted";
      let lastContactedAt = dt(contactedDay, Math.min(19, h + 2));
      let quotedAt: string | null = null;
      let wonAt: string | null = null;
      let lastInboundAt: string | null = thread[0].at;
      thread.push(
        addMessage({
          threadId: id,
          channel,
          direction: "out",
          from: ownerName,
          to: s.contact,
          subject: channel === "email" ? `Re: Wholesale enquiry from ${s.shop}, ${s.city}` : undefined,
          body:
            channel === "whatsapp"
              ? `Hi ${first}, thank you for writing. Yes, we work with stores across India. Sharing the wholesale catalogue and price list now. Minimum is 10 units per design.`
              : `Dear ${first},\n\nThank you for writing. The wholesale catalogue is attached. Minimums are 10 units per design.\n\nWarm regards,\nMeera Rathore`,
          at: lastContactedAt,
          leadId: id,
        }),
      );
      if (quotedDay <= today) {
        stage = "quoted";
        quotedAt = dt(quotedDay, rng.int(11, 17));
        lastContactedAt = quotedAt;
        thread.push(
          addMessage({
            threadId: id,
            channel,
            direction: "out",
            from: ownerName,
            to: s.contact,
            subject: channel === "email" ? `Quote: ${qty} × ${product.name}` : undefined,
            body: `Quote for ${qty} × ${product.name} at ₹${fmt(product.cost * 2)} each, total ₹${fmt(product.cost * 2 * qty)} plus GST. Freight to ${s.city} included above ₹15,000.`,
            at: quotedAt,
            leadId: id,
          }),
        );
        const decisionDay = quotedDay + rng.int(3, 10);
        if (decisionDay <= today) {
          const won = rng.next() < 0.6;
          stage = won ? "won" : "lost";
          const at = dt(decisionDay, rng.int(10, 18));
          lastInboundAt = at;
          thread.push(
            addMessage({
              threadId: id,
              channel,
              direction: "in",
              from: s.contact,
              to: ownerName,
              body: won ? `Confirmed, please go ahead with ${qty}. Sharing the GST details and delivery address.` : `Thank you ${ownerName} ji, we will hold off this season and come back for Diwali next year.`,
              at,
              leadId: id,
            }),
          );
          if (won) {
            wonAt = at;
            lastContactedAt = dt(decisionDay, 19);
          }
        } else {
          // undecided and recently quoted: not stale, we replied last
          lastContactedAt = dt(Math.max(quotedDay, today - 1), 18);
        }
      }
      const lead: Lead = {
        id,
        source: channel === "whatsapp" ? "whatsapp" : "gmail",
        createdAt: dt(d, h),
        shop: s.shop,
        contact: s.contact,
        city: s.city,
        channel,
        stage,
        estValueINR: est,
        lastContactedAt,
        lastInboundAt,
        quotedAt,
        wonAt,
        thread: thread.map((m) => ({ source: m.source, kind: "message" as const, id: m.id })),
        summary: `${s.shop}, ${s.city} asked for ${qty} × ${product.name}.`,
      };
      world.leads.push(lead);
      if (stage === "won") wonOrders.push({ lead, day: dayOfDate(wonAt!) + rng.int(1, 3) });
    }
  }
  // S1: seven hot leads, quoted, the lead asked last and nobody answered.
  S1_LEADS.forEach((s, i) => {
    const id = `L${String(leadSeq++).padStart(3, "0")}`;
    const first = s.contact.split(" ")[0];
    const inboundHours = today * 24 + 18 - s.hoursAgo; // hours since day0 00:00
    const inboundDay = Math.floor(inboundHours / 24);
    const inboundH = inboundHours % 24;
    const quotedDay = inboundDay - rng.int(1, 2);
    const createdDay = quotedDay - rng.int(3, 6);
    const thread: Message[] = [];
    const sub = s.channel === "email" ? `Wholesale order: ${s.shop}, ${s.city}` : undefined;
    thread.push(
      addMessage({ threadId: id, channel: s.channel, direction: "in", from: s.contact, to: ownerName, subject: sub, body: s.channel === "whatsapp" ? `Hi ${ownerName} ji, ${first} here from ${s.shop}, ${s.city}. We want to stock your ${s.ask}. Thinking ${s.qty}. Can you share wholesale prices?` : `Dear ${ownerName},\n\nWe run ${s.shop} in ${s.city} and would like to order your ${s.ask}. We are thinking of ${s.qty}. Could you send wholesale pricing and lead times?\n\nRegards,\n${s.contact}`, at: dt(createdDay, 11), leadId: id }),
      addMessage({ threadId: id, channel: s.channel, direction: "out", from: ownerName, to: s.contact, subject: sub && `Re: ${sub}`, body: s.channel === "whatsapp" ? `Hi ${first}, lovely to hear from you. Yes, we can do that. Sending the catalogue and will put together a quote for ${s.qty} by tomorrow.` : `Dear ${first},\n\nThank you, we would be glad to work with ${s.shop}. The catalogue is attached and a quote for ${s.qty} follows tomorrow.\n\nWarm regards,\nMeera Rathore\nKaveri Home, Jaipur`, at: dt(createdDay, 16), leadId: id }),
      addMessage({ threadId: id, channel: s.channel, direction: "out", from: ownerName, to: s.contact, subject: sub && `Quote: ${s.shop}`, body: `Quote for ${s.qty}: ₹${fmt(s.est)} plus GST, freight to ${s.city} included. Dispatch within 7 working days of confirmation.`, at: dt(quotedDay, 12), leadId: id }),
      addMessage({ threadId: id, channel: s.channel, direction: "in", from: s.contact, to: ownerName, subject: sub && `Re: Quote: ${s.shop}`, body: s.channel === "whatsapp" ? `Thanks ${ownerName} ji. ${s.question}` : `Dear ${ownerName},\n\nThank you for the quote. ${s.question}\n\nRegards,\n${s.contact}`, at: dt(inboundDay, inboundH), leadId: id }),
    );
    world.leads.push({
      id,
      source: s.channel === "whatsapp" ? "whatsapp" : "gmail",
      createdAt: dt(createdDay, 11),
      shop: s.shop,
      contact: s.contact,
      city: s.city,
      channel: s.channel,
      stage: "quoted",
      estValueINR: s.est,
      lastContactedAt: dt(quotedDay, 12),
      lastInboundAt: dt(inboundDay, inboundH),
      quotedAt: dt(quotedDay, 12),
      wonAt: null,
      thread: thread.map((m) => ({ source: m.source, kind: "message" as const, id: m.id })),
      summary: `${s.shop}, ${s.city} wants ${s.qty} (${s.ask}). Quoted ₹${fmt(s.est)}. Open question: ${s.question}`,
    });
    void i;
  });

  // ---- wholesale orders ----------------------------------------------------------------
  const wholesaleLines = (target: number, k: number): OrderLine[] => {
    const picked = rng.shuffle(PRODUCTS.map((p, i) => i)).slice(0, k);
    const share = target / k;
    return picked.map((i) => {
      const p = PRODUCTS[i];
      return { sku: p.sku, qty: Math.max(1, Math.round(share / (p.cost * 2))), price: p.cost * 2 };
    });
  };
  const addWholesaleOrder = (customerId: string, d: number, lines: OrderLine[], id?: string): Order => {
    const c = world.customers.find((x) => x.id === customerId)!;
    const o: Order = {
      id: id ?? `WO${String(world.orders.filter((x) => x.channel === "wholesale").length + 1).padStart(3, "0")}`,
      source: "zoho-books",
      createdAt: date(d),
      customerId,
      channel: "wholesale",
      lines,
      total: lines.reduce((s, l) => s + l.qty * l.price, 0),
      region: c.region,
      status: "invoiced",
    };
    world.orders.push(o);
    return o;
  };
  // Saffron Stories: two orders a week (gaps of 3 and 4 days) so every 14-day window holds four,
  // plus four extra early orders. About 30 in all.
  const saffronDays: number[] = [];
  for (let d = 1, i = 0; d <= today; d += i % 2 === 0 ? 3 : 4, i++) saffronDays.push(d);
  for (const extra of [2, 16, 30, 44]) saffronDays.push(extra);
  saffronDays.sort((a, b) => a - b);
  for (const d of saffronDays) {
    if (d === 18) continue; // the S4 invoice order, written below with an exact total
    addWholesaleOrder(PLANT.s6.customerId, d, wholesaleLines(55_800 * rng.noise(0.08), rng.int(6, 9)));
  }
  // other existing accounts: about 60 recurring orders over 90 days
  const others = wholesaleIds.filter((id) => id !== PLANT.s6.customerId);
  const recurRound = diffuser();
  for (let d = 0; d < days; d++) {
    const n = recurRound((60 / days) * rng.noise(0.1));
    for (let k = 0; k < n; k++) {
      const cid = rng.pick(others);
      const c = world.customers.find((x) => x.id === cid)!;
      if (s4Shops.includes(c.shop!) && d >= 30) continue; // the debtors stopped ordering; their S4 orders are planted
      addWholesaleOrder(cid, d, wholesaleLines(8_500 * rng.noise(0.3), rng.int(3, 6)));
    }
  }
  // lead-won orders: the lead becomes an account
  for (const { lead, day } of wonOrders) {
    if (day > today) continue;
    const cid = `w${String(wi++).padStart(2, "0")}`;
    addWholesale(cid, lead.shop, lead.city, lead.contact, day);
    lead.customerId = cid;
    addWholesaleOrder(cid, day, wholesaleLines(lead.estValueINR * rng.noise(0.1), rng.int(3, 5)));
  }
  // S4: three overdue invoices with exact totals
  const s4 = [
    { cid: PLANT.s6.customerId, day: 18, total: 48_600, id: "WO-S4-1" },
    { cid: world.customers.find((c) => c.shop === "Aranya Living")!.id, day: 41, total: 19_400, id: "WO-S4-2" },
    { cid: world.customers.find((c) => c.shop === "Dhara Home")!.id, day: 50, total: 14_400, id: "WO-S4-3" },
  ];
  for (const s of s4) addWholesaleOrder(s.cid, s.day, linesForTotal(s.total, rng), s.id);
  // Calibrate: Saffron share of 90-day revenue, then wholesale flat across the two windows.
  calibrateSaffron(world, today, false);
  calibrateFlatWindows(world, today);
  calibrateSaffron(world, today, true); // only orders before the two windows, so flatness holds

  // ---- invoices ---------------------------------------------------------------------------
  let invSeq = 142;
  const s4Ids = new Set(s4.map((s) => s.id));
  for (const o of world.orders.filter((x) => x.channel === "wholesale").sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const issued = dayOfDate(o.createdAt);
    const due = issued + 30;
    const planted = s4Ids.has(o.id);
    let paidDay: number | null = null;
    if (!planted && due <= today) {
      const onTime = rng.next() < 0.8;
      paidDay = onTime ? due + rng.int(-3, 2) : due + rng.int(3, 20);
      if (paidDay > today) paidDay = today - rng.int(0, 2); // paid late but paid: only S4 is overdue
    }
    const paidAt = paidDay === null ? null : date(paidDay);
    world.invoices.push({
      id: `inv-${o.id}`,
      source: "zoho-books",
      createdAt: date(issued),
      number: `KH/26-27/${String(invSeq++).padStart(4, "0")}`,
      customerId: o.customerId,
      orderId: o.id,
      amount: o.total,
      issuedAt: date(issued),
      dueDate: date(due),
      paidAt,
      status: paidAt ? "paid" : "unpaid",
      remindersSent: planted ? (o.id === "WO-S4-1" ? 2 : o.id === "WO-S4-2" ? 1 : 0) : 0,
      reminderSentAt: planted && o.id !== "WO-S4-3" ? date(due + 7) : null,
    });
  }
  // reminder emails already sent for the overdue ones
  for (const inv of world.invoices.filter((i) => i.remindersSent > 0)) {
    const c = world.customers.find((x) => x.id === inv.customerId)!;
    const due = dayOfDate(inv.dueDate);
    for (let r = 0; r < inv.remindersSent; r++) {
      addMessage({
        threadId: `inv-${inv.id}`,
        channel: "email",
        direction: "out",
        from: ownerName,
        to: c.contact ?? c.name,
        subject: `${r === 0 ? "Gentle reminder" : "Second reminder"}: invoice ${inv.number} of ₹${fmt(inv.amount)}`,
        body: `Dear ${(c.contact ?? c.name).split(" ")[0]},\n\nInvoice ${inv.number} for ₹${fmt(inv.amount)} was due on ${inv.dueDate}. Could you let us know when we can expect the payment?\n\nWarm regards,\nMeera Rathore\nKaveri Home, Jaipur`,
        at: dt(due + 7 + r * 12, 10),
        invoiceId: inv.id,
      });
    }
  }

  // ---- bills + subscriptions ----------------------------------------------------------------
  const addBill = (vendor: string, category: Bill["category"], amount: number, billDay: number, dueIn: number, recurring: boolean, source: Bill["source"] = "zoho-books") => {
    const paidDay = billDay + dueIn <= today ? billDay + dueIn - rng.int(0, 2) : null;
    world.bills.push({
      id: `bill-${world.bills.length + 1}`,
      source,
      createdAt: date(billDay),
      vendor,
      category,
      amount: Math.round(amount),
      billDate: date(billDay),
      dueDate: date(billDay + dueIn),
      paidAt: paidDay === null ? null : date(paidDay),
      recurring,
    });
  };
  for (const m of [0, 1, 2]) {
    addBill("JVVNL (electricity)", "electricity", 18_000 * rng.noise(0.08), 1 + 31 * m, 10, true, "gmail");
    addBill("Jaipur Packwell (packaging)", "packaging", 42_000 * rng.noise(0.06), 4 + 31 * m, 15, true);
    addBill("Sharma & Associates (accounts)", "services", 15_000, 14 + 31 * m, 7, true);
    addBill("Studio maintenance, MI Road", "other", 10_000, 7 + 31 * m, 5, true);
  }
  // Shiprocket: a fixed fee plus ₹90 per shipment, billed on the 3rd for the previous month
  for (const m of [0, 1, 2]) {
    const billDay = 23 + 31 * m; // 3 Aug, 3 Sep, 4 Oct
    const from = billDay - 31;
    const n = world.shipments.filter((s) => dayOfDate(s.dispatchedAt) >= from && dayOfDate(s.dispatchedAt) < billDay).length;
    addBill("Shiprocket", "courier", 22_000 + 90 * n, billDay, 7, true);
  }
  // rent on the 1st
  for (const d of [21, 52, 82]) addBill("MI Road studio rent", "rent", 1_20_000, d, 0, true);
  // suppliers: weekly bills for the week's cost of goods, 21-day terms
  for (let wk = 0; wk * 7 < days; wk++) {
    const from = wk * 7;
    const to = Math.min(days - 1, from + 6);
    const orders = world.orders.filter((o) => dayOfDate(o.createdAt) >= from && dayOfDate(o.createdAt) <= to);
    const bySupplier = new Map<string, number>();
    for (const o of orders) for (const l of o.lines) {
      const p = bySku.get(l.sku)!;
      bySupplier.set(p.supplier, (bySupplier.get(p.supplier) ?? 0) + l.qty * p.unitCost);
    }
    for (const [supplier, cost] of bySupplier) addBill(supplier, "supplier", cost, to + 1, 21, false);
  }
  const addSub = (id: string, vendor: string, plan: string, monthlyINR: number, lastUsedDay: number, renewDay: number, seats: number) =>
    world.subscriptions.push({ id, source: "zoho-books", createdAt: date(0), vendor, plan, monthlyINR, status: "active", lastUsedAt: date(lastUsedDay), renewsOn: date(renewDay), seats });
  addSub("sub-shopify", "Shopify", "Grow", 7_400, 89, 91, 1);
  addSub("sub-zoho", "Zoho Books", "Standard", 1_500, 89, 94, 2);
  addSub("sub-google", "Google Workspace", "Business Starter, 6 seats", 4_200, 89, 92, 6);
  addSub("sub-canva", "Canva", "Pro", 1_000, 86, 98, 1);
  addSub("sub-notion", "Notion", "Plus, 4 seats", 1_600, 88, 96, 4);
  addSub("sub-freshdesk", "Freshdesk", "Growth, 2 agents", 3_000, 89, 97, 2);
  addSub("sub-interakt", "Interakt", "WhatsApp Business API", 2_500, 89, 101, 1);

  // ---- stories (events, obligations, planted subscriptions and bills, meta) -------------------
  for (const story of STORIES) story.apply(world, rng);

  // ---- inventory from velocity --------------------------------------------------------------
  const units30 = new Map<string, number>();
  for (const o of world.orders.filter((x) => dayOfDate(x.createdAt) >= today - 29)) for (const l of o.lines) units30.set(l.sku, (units30.get(l.sku) ?? 0) + l.qty);
  for (const p of world.products) {
    if (p.sku === PLANT.s9.sku) continue;
    const monthly = units30.get(p.sku) ?? 10;
    p.onHand = Math.max(p.leadTimeDays * 2, Math.round(monthly * 1.12 * rng.noise(0.06)));
  }

  // ---- bank transactions ----------------------------------------------------------------------
  const txn = (d: number, amount: number, narration: string, category: BankTxn["category"], ref?: BankTxn["ref"]) =>
    world.bankTxns.push({ id: `tx-${world.bankTxns.length + 1}`, source: "hdfc", createdAt: date(d), date: date(d), amount: Math.round(amount), narration, category, ref });
  // Razorpay settles D2C takings two days later, net of fees
  for (let d = 2; d < days; d++) {
    const rev = world.orders.filter((o) => o.channel === "d2c" && dayOfDate(o.createdAt) === d - 2).reduce((s, o) => s + o.total, 0);
    if (rev > 0) txn(d, rev * 0.98, `RAZORPAY SETTLEMENT ${date(d - 2)}`, "payout");
  }
  for (const inv of world.invoices.filter((i) => i.paidAt)) {
    const c = world.customers.find((x) => x.id === inv.customerId)!;
    txn(dayOfDate(inv.paidAt!), inv.amount, `NEFT ${c.name.toUpperCase()} ${inv.number}`, "invoice", { source: "zoho-books", kind: "invoice", id: inv.id });
  }
  for (const d of [20, 51, 81]) txn(d, -4_10_000, "SALARY TRANSFER KAVERI HOME STAFF", "payroll");
  for (const d of [9, 40, 71]) txn(d, -(1_80_000 + rng.int(0, 15) * 1000), "GSTR-3B PAYMENT", "tax");
  for (const d of [25, 56, 86]) txn(d, -31_000, "HDFC BUSINESS LOAN EMI", "other");
  for (const b of world.bills.filter((x) => x.paidAt)) {
    txn(dayOfDate(b.paidAt!), -b.amount, `${b.vendor.toUpperCase()}`, b.category === "rent" ? "rent" : b.category === "supplier" ? "supplier" : "bill", { source: b.source, kind: "bill", id: b.id });
  }
  for (const s of world.subscriptions) {
    const renew = dayOfDate(s.renewsOn);
    for (let d = renew - 30; d >= 0; d -= 30) txn(d, -s.monthlyINR, `${s.vendor.toUpperCase()} SUBSCRIPTION`, "subscription", { source: "zoho-books", kind: "subscription", id: s.id });
  }
  for (let d = 6; d < days; d += 7) {
    const spend = world.adDays.filter((a) => dayOfDate(a.date) > d - 7 && dayOfDate(a.date) <= d).reduce((s, a) => s + a.spend, 0);
    txn(d, -spend, "META PLATFORMS ADS", "ads");
  }
  const sumOthers = world.bankTxns.reduce((s, t) => s + t.amount, 0);
  world.bankTxns.unshift({ id: "tx-0", source: "hdfc", createdAt: date(0), date: date(0), amount: Math.round(6_40_000 - sumOthers), narration: "OPENING BALANCE", category: "opening" });
  world.bankTxns.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  // ---- sources ----------------------------------------------------------------------------------
  const count = (f: (w: World) => number) => f(world);
  const sources: [Source["id"], string, Source["type"], string[], number][] = [
    ["shopify", "Shopify", "commerce", ["products", "D2C orders", "customers", "traffic"], count((w) => w.products.length + w.orders.filter((o) => o.channel === "d2c").length + w.customers.filter((c) => c.type === "d2c").length + w.trafficDays.length)],
    ["razorpay", "Razorpay", "payments", ["payment status", "payouts"], count((w) => w.bankTxns.filter((t) => t.category === "payout").length)],
    ["meta-ads", "Meta Ads", "marketing", ["campaign spend, sessions"], count((w) => w.adDays.length)],
    ["shiprocket", "Shiprocket", "logistics", ["shipments"], count((w) => w.shipments.length)],
    ["whatsapp", "WhatsApp Business", "messaging", ["lead threads", "courier threads"], count((w) => w.messages.filter((m) => m.channel === "whatsapp").length)],
    ["gmail", "Gmail", "messaging", ["wholesale email threads", "vendor bills", "renewal notices"], count((w) => w.messages.filter((m) => m.channel === "email").length + w.bills.filter((b) => b.source === "gmail").length)],
    ["zoho-books", "Zoho Books", "finance", ["invoices", "bills", "subscriptions", "wholesale orders"], count((w) => w.invoices.length + w.bills.filter((b) => b.source === "zoho-books").length + w.subscriptions.length)],
    ["hdfc", "HDFC Bank", "bank", ["bank transactions"], count((w) => w.bankTxns.length)],
    ["freshdesk", "Freshdesk", "support", ["tickets"], count((w) => w.tickets.length)],
    ["calendar", "Google Calendar", "personal", ["obligations", "meetings"], count((w) => w.obligations.length)],
  ];
  for (const [id, name, type, provides, recordCount] of sources) {
    world.sources.push({ id, name, type, provides, status: id === "freshdesk" ? "syncing" : "connected", lastSyncAt: dt(today, id === "freshdesk" ? 6 : 7, rng.int(0, 59)), recordCount });
  }

  return WorldSchema.parse(world);
}

// ---- helpers ------------------------------------------------------------------------------------

/** A shuffled deck of `size` cards in the given proportions, reshuffled when exhausted. */
function deck<T>(rng: Rng, items: readonly T[], weights: readonly number[], size: number): () => T {
  const total = weights.reduce((s, w) => s + w, 0);
  const cards: T[] = [];
  const carry = diffuser();
  items.forEach((it, i) => {
    const n = carry((weights[i] / total) * size);
    for (let k = 0; k < n; k++) cards.push(it);
  });
  let pile: T[] = [];
  return () => {
    if (!pile.length) pile = rng.shuffle(cards);
    return pile.pop()!;
  };
}

function normalise(xs: number[]): number[] {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return xs.map((x) => x / m);
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function phone(rng: Rng): string {
  return `+91 ${rng.int(70, 99)}${rng.int(100, 999)} ${rng.int(10_000, 99_999)}`;
}

function regionOfCity(city: string): Region {
  for (const r of REGIONS) if (CITIES[r].includes(city)) return r;
  const extra: Record<string, Region> = { Indore: "West", Bhopal: "North", Ludhiana: "North", Varanasi: "North", Jodhpur: "North", Nashik: "West" };
  return extra[city] ?? "North";
}

/** Wholesale lines whose total is exactly `total` (totals are multiples of 20, as are wholesale prices). */
function linesForTotal(total: number, rng: Rng): OrderLine[] {
  const pool = rng.shuffle(PRODUCTS);
  const a = pool[0];
  const b = pool[1];
  const c = PRODUCTS.find((p) => p.sku === "CER-COAST")!; // wholesale ₹520 closes the gap
  const wa = a.cost * 2;
  const wb = b.cost * 2;
  const wc = c.cost * 2;
  for (let qa = 8; qa <= 40; qa++) {
    for (let qb = 6; qb <= 40; qb++) {
      const rest = total - qa * wa - qb * wb;
      if (rest > 0 && rest % wc === 0 && rest / wc >= 4 && rest / wc <= 60) {
        return [
          { sku: a.sku, qty: qa, price: wa },
          { sku: b.sku, qty: qb, price: wb },
          { sku: c.sku, qty: rest / wc, price: wc },
        ];
      }
    }
  }
  return linesForTotal(total, rng);
}

function retotal(o: Order) {
  o.total = o.lines.reduce((s, l) => s + l.qty * l.price, 0);
}

/** Scale Saffron's unplanted orders so its share of 90-day revenue is PLANT.s6.share. */
function calibrateSaffron(world: World, today: number, outsideWindowsOnly: boolean) {
  const day = (iso: string) => daysBetween(world.meta.day0, iso);
  for (let i = 0; i < 4; i++) {
    const total = world.orders.reduce((s, o) => s + o.total, 0);
    const saffron = world.orders.filter((o) => o.customerId === PLANT.s6.customerId);
    const sum = saffron.reduce((s, o) => s + o.total, 0);
    const other = total - sum;
    const target = (PLANT.s6.share / (1 - PLANT.s6.share)) * other;
    const fixed = (o: Order) => o.id.startsWith("WO-S4") || (outsideWindowsOnly && day(o.createdAt) >= today - 27);
    const held = saffron.filter(fixed).reduce((s, o) => s + o.total, 0);
    const f = (target - held) / (sum - held);
    for (const o of saffron) {
      if (fixed(o)) continue;
      for (const l of o.lines) l.qty = Math.max(1, Math.round(l.qty * f));
      retotal(o);
    }
  }
}

/** Wholesale revenue in the current 14 days within ±1% of the previous 14 (docs/DATA-MODEL.md). */
function calibrateFlatWindows(world: World, today: number) {
  const day = (iso: string) => daysBetween(world.meta.day0, iso);
  const sum = (from: number, to: number) => world.orders.filter((o) => o.channel === "wholesale" && day(o.createdAt) >= from && day(o.createdAt) <= to).reduce((s, o) => s + o.total, 0);
  for (let i = 0; i < 6; i++) {
    const prev = sum(today - 27, today - 14);
    const cur = sum(today - 13, today);
    if (Math.abs(cur / prev - 1) <= 0.01) return;
    const f = prev / cur;
    const targets = world.orders.filter((o) => o.channel === "wholesale" && day(o.createdAt) >= today - 13 && !o.id.startsWith("WO-S4"));
    for (const o of targets) {
      for (const l of o.lines) l.qty = Math.max(1, Math.round(l.qty * f));
      retotal(o);
    }
    // fine tune one unit at a time on the line whose price best closes the gap
    for (let j = 0; j < 40; j++) {
      const gap = sum(today - 27, today - 14) - sum(today - 13, today);
      if (Math.abs(gap) <= prev * 0.004) break;
      let best: { o: Order; l: OrderLine } | null = null;
      for (const o of targets) for (const l of o.lines) {
        if (gap < 0 && l.qty <= 1) continue;
        if (!best || Math.abs(Math.abs(gap) - l.price) < Math.abs(Math.abs(gap) - best.l.price)) best = { o, l };
      }
      if (!best) break;
      best.l.qty += gap > 0 ? 1 : -1;
      retotal(best.o);
    }
  }
}

export type { Rng };
export { PRODUCTS };
export type SeedRecord = Customer | Product | Order | Shipment | Lead | Message | Invoice | Bill | Subscription | AdDay | TrafficDay | Ticket | BankTxn;
