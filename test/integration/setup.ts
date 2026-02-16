// Setup global pour les tests d'intégration
afterAll(async () => {
  // Attendre un peu pour s'assurer que toutes les connexions sont fermées
  await new Promise((resolve) => setTimeout(resolve, 500));
});
