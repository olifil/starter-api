import * as Handlebars from 'handlebars';

export function registerHandlebarsHelpers(): void {
  Handlebars.registerHelper('formatDate', (date: string | Date, format: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);

    const options: Record<string, Intl.DateTimeFormatOptions> = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      long: {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
      datetime: {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    };

    const fmt = options[format] || options['short'];
    return d.toLocaleDateString('fr-FR', fmt);
  });

  Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  });

  Handlebars.registerHelper('pluralize', (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  });

  Handlebars.registerHelper('uppercase', (str: string) => {
    return typeof str === 'string' ? str.toUpperCase() : str;
  });

  Handlebars.registerHelper('lowercase', (str: string) => {
    return typeof str === 'string' ? str.toLowerCase() : str;
  });

  Handlebars.registerHelper('capitalize', (str: string) => {
    if (typeof str !== 'string' || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
}
