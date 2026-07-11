
import 'server-only'; // Garantiza que este código nunca llegue al cliente

const dictionaries = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  es: () => import('./dictionaries/es.json').then((module) => module.default),
};

export const getDictionary = async (locale: 'es' | 'en') => {
  // Retorna español por defecto si ocurre un error
  return dictionaries[locale]?.() ?? dictionaries.es();
};