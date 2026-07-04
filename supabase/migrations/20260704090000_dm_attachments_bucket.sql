/*
  # DM attachments storage bucket

  Guarantees the `dm-attachments` bucket exists and is publicly
  readable. Previously the client silently fell back to blob: URLs
  when the bucket was missing, which produced attachments the
  recipient could never open.

  1. Bucket: dm-attachments (public read)
  2. Policies: public SELECT, anon+authenticated INSERT (the app uses
     custom Steam auth, matching the trust model of the other tables)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-attachments', 'dm-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "dm attachments public read" ON storage.objects;
CREATE POLICY "dm attachments public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'dm-attachments');

DROP POLICY IF EXISTS "dm attachments insert" ON storage.objects;
CREATE POLICY "dm attachments insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'dm-attachments');
