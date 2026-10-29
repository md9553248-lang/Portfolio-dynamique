// jsdom (l'environnement de test) n'implémente pas window.scrollTo : on le remplace par une fonction vide.
window.scrollTo = () => {};
