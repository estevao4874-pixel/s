-- Rodar no SQL Editor se a Ana ainda existir no banco
UPDATE professionals SET active = FALSE WHERE name ILIKE '%Ana%';
DELETE FROM professionals WHERE name ILIKE '%Ana%';
