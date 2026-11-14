-- La location de tenue par la plateforme n'est plus proposée : les réservations qui l'avaient choisie passent en
-- « tenue prêtée par l'exposant ». La valeur reste dans le type outfit_mode (Postgres ne sait pas en retirer une).
UPDATE "bookings" SET "outfit" = 'exposant' WHERE "outfit" = 'standby';
