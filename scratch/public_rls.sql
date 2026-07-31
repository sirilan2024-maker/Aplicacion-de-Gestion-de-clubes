-- Enable public read access for partidos and match_events so /live works for anonymous users
CREATE POLICY "Allow public read access to partidos" ON "public"."partidos" FOR SELECT USING (true);
CREATE POLICY "Allow public read access to match_events" ON "public"."match_events" FOR SELECT USING (true);
CREATE POLICY "Allow public read access to teams" ON "public"."teams" FOR SELECT USING (true);
CREATE POLICY "Allow public read access to players" ON "public"."players" FOR SELECT USING (true);
