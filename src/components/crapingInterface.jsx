import { useState } from 'react';
import { Search, Download, Loader, AlertCircle, CheckCircle2, Copy } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api/v1';

export default function ScrapingInterface() {
  const [formData, setFormData] = useState({
    url: 'https://www.tony.com.mx/escolar/cuadernos-y-libretas?initialMap=c&initialQuery=escolar&map=category-1,category-2&page=3',
    selector: '.vtex-product-summary-2-x-element'
  });
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Error al conectar con la API');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  // Extrae la URL de la primera imagen del HTML
  const extractImgUrl = (html) => {
    if (!html) return '';
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : '';
  };

  const exportResults = () => {
    if (!results) return;

    const dataToExport = {
      scraping_results: results.data.elements.map(item => {
        const cleaned = cleanText(item.text);
        const { referencia, contenido } = extractReference(cleaned);
        const { producto, precioUno } = splitProductPrice(contenido);
        const imgUrl = extractImgUrl(item.html);

        // Construye el objeto sin comillas en las claves
        return {
          id: referencia ? Number(referencia) : null,
          nombre: producto,
          precio: precioUno ? Number(precioUno.replace(/[^0-9.,]/g, '').replace(',', '.')) : null,
          imagen: imgUrl
        };
      }),
      metadata: results.metadata,
      total_items: results.data.count
    };

    // Convierte a texto con claves sin comillas
    const jsonString = JSON.stringify(dataToExport, null, 2)
      .replace(/"(\w+)":/g, '$1:'); // quita comillas de las claves

    const blob = new Blob([jsonString], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraping-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtra la cadena no deseada
  const cleanText = (text) => text.replace(/\*Color No Seleccionable/g, '').trim();

  // Busca "Referencia" y separa referencia y contenido
  const extractReference = (text) => {
    const refRegex = /Referencia:\s*(\d+)/;
    const refMatch = text.match(refRegex);
    if (refMatch) {
      const referencia = refMatch[1];
      const refEndIdx = text.indexOf(refMatch[0]) + refMatch[0].length;
      const contenido = (text.slice(0, text.indexOf(refMatch[0])) + text.slice(refEndIdx)).trim();
      return { referencia, contenido };
    }
    return { referencia: '', contenido: text.trim() };
  };

  // Separa producto y precios usando los signos $
  const splitProductPrice = (contenido) => {
    const dollarIdx1 = contenido.indexOf('$');
    if (dollarIdx1 !== -1) {
      const producto = contenido.slice(0, dollarIdx1).trim();
      const resto = contenido.slice(dollarIdx1).trim();
      const dollarIdx2 = resto.indexOf('$', 1); // busca el segundo $
      if (dollarIdx2 !== -1) {
        const precioUno = resto.slice(0, dollarIdx2).trim();
        let precioDos = resto.slice(dollarIdx2).trim();
        // Limpia precioDos: deja solo hasta el último número decimal
        const decimalMatch = precioDos.match(/(\d+\.\d{2})/g);
        if (decimalMatch && decimalMatch.length > 0) {
          const lastDecimal = decimalMatch[decimalMatch.length - 1];
          const idx = precioDos.lastIndexOf(lastDecimal) + lastDecimal.length;
          precioDos = precioDos.slice(0, idx).trim();
        }
        return { producto, precioUno, precioDos };
      } else {
        return { producto, precioUno: resto, precioDos: '' };
      }
    }
    return { producto: contenido, precioUno: '', precioDos: '' };
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 animate-fade-in">
          🔍 Scraping Interface
        </h1>
        <p className="text-xl text-gray-600">
          Extrae información de cualquier sitio web de forma profesional
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* URL Input */}
            <div className="space-y-2">
              <label htmlFor="url" className="block text-sm font-semibold text-gray-700">
                URL del sitio web
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                placeholder="https://example.com"
              />
            </div>

            {/* Selector Input */}
            <div className="space-y-2">
              <label htmlFor="selector" className="block text-sm font-semibold text-gray-700">
                CSS Selector
              </label>
              <input
                type="text"
                id="selector"
                name="selector"
                value={formData.selector}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                placeholder=".product-item, #content, .title"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Extrayendo datos...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Iniciar Scraping
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-fade-in">
          {/* Success Header */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <h3 className="font-semibold text-green-800">Scraping Completado</h3>
                  <p className="text-green-700">
                    {results.data.count} elementos extraídos en {results.metadata.executionTime}
                  </p>
                </div>
              </div>
              
              <button
                onClick={exportResults}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Resultados ({results.data.count} elementos)
              </h2>
              
              <button
                onClick={() => {
                  const data = results.data.elements.map(item => {
                    const cleaned = cleanText(item.text);
                    const { referencia, contenido } = extractReference(cleaned);
                    const { producto, precioUno } = splitProductPrice(contenido);
                    const imgUrl = extractImgUrl(item.html);
                    return {
                      id: referencia ? Number(referencia) : null,
                      nombre: producto,
                      precio: precioUno ? Number(precioUno.replace(/[^0-9.,]/g, '').replace(',', '.')) : null,
                      imagen: imgUrl
                    };
                  });
                  // Convierte a texto con claves sin comillas
                  const jsonString = JSON.stringify(data, null, 2).replace(/"(\w+)":/g, '$1:');
                  copyToClipboard(jsonString);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  copied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copiado!' : 'Copiar todo'}
              </button>
            </div>

            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {results.data.elements.map((item, index) => {
                const cleaned = cleanText(item.text);
                const { referencia, contenido } = extractReference(cleaned);
                const { producto, precioUno, precioDos } = splitProductPrice(contenido);
                const imgUrl = extractImgUrl(item.html);
                return (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-xl p-4 border hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Columna de imagen */}
                      <div className="flex-shrink-0 w-24 flex items-center justify-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={producto}
                            className="w-20 h-20 object-contain rounded-lg border"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">Sin imagen</span>
                        )}
                      </div>
                      {/* Columna de datos */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-500">Elemento extraído</span>
                        </div>
                        <p className="text-gray-800 leading-relaxed text-sm">
                          <span className="font-semibold">Referencia:</span> {referencia || 'N/A'}
                        </p>
                        <p className="text-gray-800 leading-relaxed text-sm mt-1">
                          <span className="font-semibold">Producto:</span> {producto}
                        </p>
                        <p className="text-gray-800 leading-relaxed text-sm mt-1">
                          <span className="font-semibold">Precio 1:</span> {precioUno || 'N/A'}
                        </p>
                        {precioDos && (
                          <p className="text-gray-800 leading-relaxed text-sm mt-1">
                            <span className="font-semibold">Precio 2:</span> {precioDos}
                          </p>
                        )}
                        <p className="text-gray-800 leading-relaxed text-sm mt-1">
                          <span className="font-semibold">Imagen:</span>{' '}
                          {imgUrl ? (
                            <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              {imgUrl}
                            </a>
                          ) : 'N/A'}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(producto + (precioUno ? ' ' + precioUno : '') + (precioDos ? ' ' + precioDos : ''))}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 transition-all"
                        title="Copiar contenido"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <span className="font-semibold">Método:</span> {results.metadata.method}
              </div>
              <div>
                <span className="font-semibold">Tiempo:</span> {results.metadata.executionTime}
              </div>
              <div>
                <span className="font-semibold">Fecha:</span> {new Date(results.metadata.scrapedAt).toLocaleString('es-ES')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}