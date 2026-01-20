-- Function to match media embeddings using cosine distance
-- Callable via Supabase Client: supabase.rpc('match_media_embeddings', { query_embedding: [...], match_threshold: 0.5, match_count: 10 })

create or replace function match_media_embeddings (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  filename text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    media.id,
    media.filename,
    1 - (media_embeddings.embedding <=> query_embedding) as similarity
  from media_embeddings
  join media on media.id = media_embeddings.id
  where 1 - (media_embeddings.embedding <=> query_embedding) > match_threshold
  order by media_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
