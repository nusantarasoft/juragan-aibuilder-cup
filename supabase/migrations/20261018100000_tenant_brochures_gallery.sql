-- =============================================================================
-- Migration: 20261018100000_tenant_brochures_gallery.sql
-- Purpose: Multi-Tenant Brochure Showcase & Omni-Share
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_brochures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  tenant_name TEXT NOT NULL,
  tenant_slug TEXT NOT NULL,
  tenant_plan TEXT NOT NULL DEFAULT 'Signature',
  tenant_logo_initials TEXT NOT NULL DEFAULT 'NS',
  tenant_accent_color TEXT NOT NULL DEFAULT '#fb923c',
  tenant_verified BOOLEAN NOT NULL DEFAULT true,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Food & Beverage',
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '3:4',
  featured BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  cta_label TEXT NOT NULL DEFAULT 'Order via WhatsApp',
  cta_url TEXT NOT NULL DEFAULT 'https://wa.me/62811924689',
  contact_phone TEXT NOT NULL DEFAULT '+62 811-924-689',
  contact_email TEXT NOT NULL DEFAULT 'hello@nusantarasoft.id',
  location TEXT NOT NULL DEFAULT 'Jakarta, Indonesia',
  promo_code TEXT NOT NULL DEFAULT 'PROMO2026',
  valid_until DATE DEFAULT '2026-12-31',
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  palette JSONB NOT NULL DEFAULT '["#fb923c", "#38bdf8", "#0b0e13"]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_brochures_slug ON public.tenant_brochures(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_brochures_tenant_slug ON public.tenant_brochures(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_tenant_brochures_category ON public.tenant_brochures(category);
CREATE INDEX IF NOT EXISTS idx_tenant_brochures_featured ON public.tenant_brochures(featured);

ALTER TABLE public.tenant_brochures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenant_brochures' AND policyname = 'Public read active tenant brochures'
  ) THEN
    CREATE POLICY "Public read active tenant brochures"
      ON public.tenant_brochures
      FOR SELECT
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenant_brochures' AND policyname = 'Service and anon manage tenant brochures'
  ) THEN
    CREATE POLICY "Service and anon manage tenant brochures"
      ON public.tenant_brochures
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.increment_brochure_metric(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.increment_brochure_metric(
  p_slug TEXT,
  p_metric TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_metric = 'views' THEN
    UPDATE public.tenant_brochures SET views_count = views_count + 1, updated_at = now() WHERE slug = p_slug;
  ELSIF p_metric = 'shares' THEN
    UPDATE public.tenant_brochures SET shares_count = shares_count + 1, updated_at = now() WHERE slug = p_slug;
  ELSIF p_metric = 'downloads' THEN
    UPDATE public.tenant_brochures SET downloads_count = downloads_count + 1, updated_at = now() WHERE slug = p_slug;
  ELSIF p_metric = 'likes' THEN
    UPDATE public.tenant_brochures SET likes_count = likes_count + 1, updated_at = now() WHERE slug = p_slug;
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.tenant_brochures TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_brochure_metric(TEXT, TEXT) TO anon, authenticated, service_role;

TRUNCATE TABLE public.tenant_brochures;

INSERT INTO public.tenant_brochures (
  id, tenant_id, tenant_name, tenant_slug, tenant_plan, tenant_logo_initials,
  tenant_accent_color, tenant_verified, title, slug, subtitle, description,
  category, tags, image_url, aspect_ratio, featured, views_count, shares_count,
  downloads_count, likes_count, cta_label, cta_url, contact_phone, contact_email,
  location, promo_code, valid_until, highlights, palette, metadata
)
VALUES
(
  'b0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'Kopi Senja & Roastery Nusantara',
  'kopi-senja-roastery',
  'F&B · Roastery',
  'KS',
  '#f59e0b',
  true,
  'Single-Origin Archipelago Espresso & Cold Brew Menu',
  'kopi-senja-archipelago-menu',
  'Aceh Gayo Wine, Toraja Sapan, Oat Latte & Signature Palm Sugar Cold Brew',
  'Seasonal specialty coffee brochure from Kopi Senja Roastery featuring micro-lot Indonesian Arabica beans, 18-hour slow-steeped cold brew bottles, and artisanal espresso creations.',
  'Food & Beverage',
  ARRAY['Specialty Coffee', 'Gula Aren Latte', 'Cold Brew', 'Arabica Gayo', 'Roastery'],
  '/api/brochure-svg/kopi-senja-archipelago-menu',
  '3:4',
  true,
  1420, 530, 402, 628,
  'Order via WhatsApp',
  'https://wa.me/6281390901122?text=Halo%20Kopi%20Senja%2C%20saya%20ingin%20pesan%20menu%20kopi%20dari%20brosur',
  '+62 813-9090-1122',
  'roastery@kopisenja.id',
  'Senopati · Jakarta Selatan & Braga · Bandung',
  'SENJABREW20',
  '2026-12-31',
  '[{"x":34,"y":34,"label":"Es Kopi Senja Gula Aren (1 Liter)","price":"Rp 85.000","detail":"Double-shot house Arabica blend with organic palm nectar and creamy fresh milk."},{"x":66,"y":52,"label":"Aceh Gayo Wine Manual Brew V60","price":"Rp 42.000","detail":"Notes of blackcurrant, dark cacao nibs, and sweet tropical jackfruit aroma."},{"x":42,"y":74,"label":"Butterscotch Sea Salt Oat Latte","price":"Rp 45.000","detail":"Velvety oat milk espresso topped with house-torched sea salt caramel cream."}]'::jsonb,
  '["#f59e0b","#fb923c","#1c140d","#fde68a"]'::jsonb,
  '{"edition":"Harvest Menu 2026","pages":4,"printSpec":"Brochure Lookbook","resolution":"1600x2133"}'::jsonb
),
(
  'b0000001-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000010',
  'Dapur Nusantara Heritage Dining',
  'dapur-nusantara-catering',
  'F&B · Heritage Dining',
  'DN',
  '#f43f5e',
  true,
  'Sajian Rempah Kraton, Tumpeng Royal & Rijsttafel',
  'dapur-nusantara-royal-catering',
  'Rendang Wagyu Padang, Ayam Betutu Gilimanuk, Sate Maranggi & Nasi Kuning Organik',
  'Authentic Indonesian archipelago culinary brochure showcasing royal tumpeng platters, slow-braised Wagyu rendang, wood-fired satay, and festive family dining packages.',
  'Food & Beverage',
  ARRAY['Kuliner Nusantara', 'Tumpeng Royal', 'Rendang Wagyu', 'Sate Maranggi', 'Halal'],
  '/api/brochure-svg/dapur-nusantara-royal-catering',
  '3:4',
  true,
  1340, 615, 489, 710,
  'Reserve Table / Order',
  'https://wa.me/6281233447788?text=Halo%20Dapur%20Nusantara%2C%20saya%20ingin%20pesan%20menu%20dari%20brosur',
  '+62 812-3344-7788',
  'reservasi@dapurnusantara.id',
  'Kemang Raya · Jakarta Selatan',
  'REMPAHROYAL15',
  '2026-12-31',
  '[{"x":32,"y":36,"label":"Tumpeng Royal Nusantara (15 Pax)","price":"Rp 1.250.000","detail":"Organic turmeric cone rice with Jimbaran grilled prawns, empal gepuk & urap Bali."},{"x":65,"y":54,"label":"8-Hour Braised Wagyu Rendang Platter","price":"Rp 165.000","detail":"Caramelized Minang coconut spices with tender MB7 Wagyu beef shank & cassava leaves."},{"x":45,"y":76,"label":"Nasi Campur Bali Eksekutif Box","price":"Rp 68.000","detail":"Ayam Suwir Pelalah, Sate Lilit Ikan, Telur Pindang, and fresh Sambal Matah."}]'::jsonb,
  '["#f43f5e","#fb923c","#1f0910","#fda4af"]'::jsonb,
  '{"edition":"Royal Spice 2026","pages":6,"printSpec":"Dine-In & Catering Brochure","resolution":"1600x2133"}'::jsonb
),
(
  'b0000001-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000010',
  'Maison Levain Boulangerie & Patisserie',
  'maison-levain-bakery',
  'F&B · Bakery',
  'ML',
  '#fb923c',
  true,
  'French Butter Croissants, 48h Sourdough & Viennoiserie',
  'maison-levain-sourdough-patisserie',
  'Baked Fresh Hourly with AOP Isigny Butter, Pistachio Kunafa & Truffle Brioche',
  'Artisanal bakery and French patisserie showcase featuring flaky honeycomb-laminated croissants, naturally leavened country sourdough loaves, and seasonal fruit tarts.',
  'Bakery & Dessert',
  ARRAY['Croissant', 'Sourdough', 'French Patisserie', 'Artisan Bakery', 'Dessert'],
  '/api/brochure-svg/maison-levain-sourdough-patisserie',
  '3:4',
  true,
  1180, 470, 350, 590,
  'Pre-Order Pastry Box',
  'https://wa.me/628119887766?text=Halo%20Maison%20Levain%2C%20mau%20pesan%20Pastry%20Box%20dari%20brosur',
  '+62 811-988-7766',
  'bonjour@maisonlevain.id',
  'PIK 2 Pantjoran & Menteng · Jakarta',
  'BUTTERLOVE10',
  '2026-12-20',
  '[{"x":30,"y":35,"label":"Pistachio Kunafa Supreme Croissant","price":"Rp 54.000","detail":"27-layer AOP French butter pastry filled with roasted Sicilian pistachio praline."},{"x":68,"y":52,"label":"48-Hour Wild Ferment Country Sourdough","price":"Rp 78.000","detail":"Stone-milled organic wheat crust with open crumb and blistered caramel finish."},{"x":44,"y":75,"label":"Signature Viennoiserie Box (6 Pcs)","price":"Rp 245.000","detail":"Assorted Pain au Chocolat, Almond Bostock, Kouign-Amann & Yuzu Cruffin."}]'::jsonb,
  '["#fb923c","#facc15","#1c1209","#fed7aa"]'::jsonb,
  '{"edition":"Autumn Bake 2026","pages":4,"printSpec":"Patisserie Collection","resolution":"1600x2133"}'::jsonb
),
(
  'b0000001-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000010',
  'Kurotora Ramen & Charcoal Izakaya',
  'kurotora-ramen-izakaya',
  'F&B · Japanese',
  'KR',
  '#ef4444',
  true,
  '18-Hour Black Garlic Tonkotsu Ramen & Robatayaki',
  'kurotora-truffle-ramen-izakaya',
  'Hand-Pulled Hakata Noodles, A5 Miyazaki Wagyu Aburi & Binchotan Kushiyaki Skewers',
  'Late-night Japanese ramen bar and charcoal izakaya menu brochure showcasing rich collagen broth bowls, flame-seared wagyu donburi, and binchotan-grilled skewers.',
  'Food & Beverage',
  ARRAY['Ramen', 'Izakaya', 'Wagyu Donburi', 'Yakitori', 'Japanese Food'],
  '/api/brochure-svg/kurotora-truffle-ramen-izakaya',
  '3:4',
  true,
  1290, 495, 380, 645,
  'Book Izakaya Seat',
  'https://wa.me/6281288990011?text=Halo%20Kurotora%20Ramen%2C%20mau%20reservasi%20meja%20dari%20brosur',
  '+62 812-8899-0011',
  'irasshai@kurotora.id',
  'Blok M Little Tokyo · Jakarta Selatan',
  'KUROTORAVIP',
  '2026-12-31',
  '[{"x":28,"y":38,"label":"Black Truffle Tori Paitan Ramen","price":"Rp 88.000","detail":"18-hour creamy chicken collagen broth, sous-vide chashu, ajitama egg & black truffle oil."},{"x":66,"y":54,"label":"A5 Miyazaki Wagyu Truffle Gyudon","price":"Rp 148.000","detail":"Torch-seared A5 wagyu ribeye over Koshihikari rice with onsen egg & crispy garlic."},{"x":46,"y":76,"label":"Binchotan Kushiyaki Platter (8 Pcs)","price":"Rp 95.000","detail":"Negima, Tsukune with cured yolk, salmon belly mentaiko & shiitake tare glaze."}]'::jsonb,
  '["#ef4444","#f97316","#180909","#fca5a5"]'::jsonb,
  '{"edition":"Izakaya Night 2026","pages":4,"printSpec":"Ramen & Grill Poster","resolution":"1600x2133"}'::jsonb
),
(
  'b0000001-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000010',
  'Uji Komorebi Matcha & Tea House',
  'uji-komorebi-matcha',
  'F&B · Tea Bar',
  'UK',
  '#22c55e',
  true,
  'First-Harvest Kyoto Ceremonial Matcha & Dessert Bar',
  'uji-komorebi-ceremonial-matcha',
  'Stone-Milled Uji Matcha Whisked to Order, Hojicha Mille Crepe & Warabimochi Parfait',
  'Specialty Japanese tea house brochure highlighting single-cultivar Uji ceremonial matcha lattes, roasted hojicha creations, and handcrafted wagashi desserts.',
  'Bakery & Dessert',
  ARRAY['Ceremonial Matcha', 'Uji Kyoto', 'Hojicha', 'Dessert Cafe', 'Mille Crepe'],
  '/api/brochure-svg/uji-komorebi-ceremonial-matcha',
  '3:4',
  false,
  1050, 420, 310, 540,
  'Order Matcha & Cake',
  'https://wa.me/6281377665544?text=Halo%20Uji%20Komorebi%2C%20saya%20mau%20pesan%20Matcha%20dari%20brosur',
  '+62 813-7766-5544',
  'tea@ujikomorebi.id',
  'Canggu · Bali & Senayan · Jakarta',
  'UJIGREEN15',
  '2026-12-31',
  '[{"x":33,"y":35,"label":"Samidori Ceremonial Matcha Oat Cloud","price":"Rp 56.000","detail":"Hand-whisked first-flush Uji matcha over cold oat milk with lightly salted matcha foam."},{"x":68,"y":52,"label":"Charcoal Roasted Hojicha Mille Crepe","price":"Rp 64.000","detail":"22 paper-thin crepes layered with smoky Kyoto hojicha diplomat cream & kuromitsu."},{"x":42,"y":76,"label":"Supreme Matcha Gelato & Warabimochi Parfait","price":"Rp 72.000","detail":"Double-rich matcha gelato, kinako warabimochi, Hokkaido red bean & crispy monaka."}]'::jsonb,
  '["#22c55e","#84cc16","#071c10","#86efac"]'::jsonb,
  '{"edition":"First Flush 2026","pages":4,"printSpec":"Tea Atelier Menu","resolution":"1600x2133"}'::jsonb
),
(
  'b0000001-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000010',
  'Smokehouse 62 Woodfire Grill & Burger',
  'smokehouse-62-grill',
  'F&B · Smokehouse',
  'S6',
  '#f97316',
  true,
  '14-Hour Wood-Smoked Texas Brisket & Smash Burgers',
  'smokehouse-62-brisket-burger',
  'USDA Prime Black Angus Brisket, Dry-Aged Double Smash Burgers & Craft Root Beer',
  'Woodfire smokehouse and craft burger brochure featuring low-and-slow rambutan wood-smoked meats, crispy lace-edged wagyu smash burgers, and house-made barbecue sauces.',
  'Food & Beverage',
  ARRAY['Smoked Brisket', 'Smash Burger', 'Woodfire BBQ', 'Short Ribs', 'Steakhouse'],
  '/api/brochure-svg/smokehouse-62-brisket-burger',
  '3:4',
  false,
  990, 365, 275, 480,
  'Order Meat Platter',
  'https://wa.me/6281155667788?text=Halo%20Smokehouse%2062%2C%20mau%20pesan%20Brisket%20Platter%20dari%20brosur',
  '+62 811-5566-7788',
  'pitmaster@smokehouse62.id',
  'Cipete · Jakarta Selatan & Surabaya Barat',
  'SMOKEPIT20',
  '2026-12-31',
  '[{"x":28,"y":38,"label":"Pitmaster Smoked Brisket Platter (300g)","price":"Rp 185.000","detail":"14-hour smoked USDA Prime brisket with mac & cheese, jalapeño cornbread & pickles."},{"x":64,"y":53,"label":"Double Truffle Wagyu Smash Burger","price":"Rp 92.000","detail":"Two crispy-edge dry-aged wagyu patties, aged cheddar, caramelized onion & brioche bun."},{"x":48,"y":75,"label":"Dino Beef Short Ribs (500g Bone-In)","price":"Rp 265.000","detail":"Espresso-peppercorn bark glazed with smoky applewood barbecue reduction."}]'::jsonb,
  '["#f97316","#eab308","#1a0d06","#fdba74"]'::jsonb,
  '{"edition":"Pitmaster Menu 2026","pages":4,"printSpec":"Smokehouse Lookbook","resolution":"1600x2133"}'::jsonb
),
(
  'b0000001-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000010',
  'Sekar Jagad Heritage Batik & Resort Wear',
  'sekar-jagad-batik',
  'Fashion & Craft',
  'SJ',
  '#eab308',
  true,
  'Hand-Drawn Royal Solo Silk Batik & Resort Lookbook',
  'sekar-jagad-royal-batik-lookbook',
  'Natural Indigo Tulis Silk, Tenun Ikat Sumba Outer & Executive Tailored Collections',
  'Fashion & heritage craft brochure from Sekar Jagad showcasing 90-day hand-waxed Batik Tulis on mulberry silk, organic plant-dyed resort wear, and bespoke corporate attire.',
  'Fashion & Lifestyle',
  ARRAY['Batik Tulis', 'Resort Wear', 'Tenun Sumba', 'Silk Tailoring', 'Heritage Fashion'],
  '/api/brochure-svg/sekar-jagad-royal-batik-lookbook',
  '3:4',
  false,
  870, 340, 255, 430,
  'Inquire Collection',
  'https://wa.me/6281244556677?text=Halo%20Sekar%20Jagad%2C%20saya%20tertarik%20koleksi%20Batik%20dari%20brosur',
  '+62 812-4455-6677',
  'atelier@sekarjagad.id',
  'Plaza Indonesia · Jakarta & Kauman · Solo',
  'HERITAGE15',
  '2026-12-25',
  '[{"x":34,"y":35,"label":"Batik Tulis Sutra Parang Kusumo","price":"Rp 2.450.000","detail":"100% mulberry ATBM silk, hand-drawn canting motif with natural soga & indigo dye."},{"x":64,"y":54,"label":"Tenun Ikat Sumba Structured Outer","price":"Rp 1.380.000","detail":"Handwoven East Sumba cotton textile tailored into a modern unisex resort jacket."},{"x":45,"y":77,"label":"Corporate Executive Batik Uniforms","price":"Rp 420.000 / pc","detail":"Custom company logo integration in traditional motif (min. order 25 pcs)."}]'::jsonb,
  '["#eab308","#f97316","#1c1306","#fde047"]'::jsonb,
  '{"edition":"Runway Collection 2026","pages":8,"printSpec":"Fashion Lookbook","resolution":"1600x2133"}'::jsonb
),
(
  'b0000001-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000010',
  'Botanika Sanctuary Spa & Skincare',
  'botanika-sanctuary-spa',
  'Beauty & Wellness',
  'BS',
  '#06b6d4',
  true,
  'Balinese Aromatherapy Rituals & Organic Skincare Catalog',
  'botanika-balinese-spa-skincare',
  'Royal Boreh Scrub, Frangipani Essential Oils, Volcanic Clay Mask & Couple Spa Packages',
  'Wellness sanctuary and botanical skincare brochure featuring holistic Balinese massage rituals, cold-pressed essential oils, and luxury spa gift hampers.',
  'Beauty & Wellness',
  ARRAY['Balinese Spa', 'Organic Skincare', 'Aromatherapy', 'Wellness Ritual', 'Hampers'],
  '/api/brochure-svg/botanika-balinese-spa-skincare',
  '3:4',
  false,
  1120, 460, 342, 585,
  'Book Spa / Order',
  'https://wa.me/6281133221100?text=Halo%20Botanika%20Spa%2C%20mau%20booking%20paket%20spa%20dari%20brosur',
  '+62 811-3322-1100',
  'concierge@botanikaspa.id',
  'Ubud · Bali & Pondok Indah · Jakarta',
  'BOTANIKA20',
  '2026-12-31',
  '[{"x":32,"y":36,"label":"120-Min Royal Balinese Sanctuary Ritual","price":"Rp 650.000","detail":"Warm stone massage, organic Javanese lulur body polish, and flower petal herbal bath."},{"x":68,"y":52,"label":"Bakuchiol & Sacred Lotus Botanical Serum","price":"Rp 340.000","detail":"Plant-based retinol alternative with cold-pressed tamanu and Bali frangipani extract."},{"x":44,"y":76,"label":"Aromatherapy Diffuser & Oil Gift Set","price":"Rp 495.000","detail":"Hand-thrown ceramic ultrasonic diffuser with 3 pure essential oil blends."}]'::jsonb,
  '["#06b6d4","#14b8a6","#071722","#67e8f9"]'::jsonb,
  '{"edition":"Sanctuary Edition 2026","pages":6,"printSpec":"Wellness Brochure","resolution":"1600x2133"}'::jsonb
);
