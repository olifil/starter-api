import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../.env.test'),
  override: true,
});

// Supprimer les variables optionnelles qui ne doivent pas être définies en test
// (une chaîne vide est différente de "non défini" pour la validation @IsUrl)
delete process.env.MATOMO_URL;
delete process.env.MATOMO_TOKEN;
