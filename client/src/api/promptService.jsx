import { fetchCCGResponse } from './apiService';
import { parseAndConstructData } from '../utils/responseParser';
import toast from 'react-hot-toast';
import { translations } from '../constants/translations';

const sessionCache = new Map();

const handleError = (error, lang) => {
  const t = translations[lang];
  let message = t.errorDefault;

  if (error.message?.includes('Network')) {
    message = t.errorNetwork;
  }

  toast.error(message, { duration: 5000 });
};

export const callApi = async ({
  mode,
  userInput,
  os,
  osVersion,
  cli,
  lang,
  iteration = 0,
  codeA = '',
  codeB = '',
  knowledgeLevel,
  deviceType,
  existingCommands,
  analysis,
}, onUpdate) => {

  const t = translations[lang];

  const cacheKey = `${lang}-${mode}-${os}-${osVersion}-${cli}-${userInput}-${iteration}-${codeA.length}-${codeB.length}-${knowledgeLevel}-${deviceType}-${existingCommands?.length}`;

  if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey);

  onUpdate?.('fetching');

  const apiParams = {
    mode,
    os,
    lang,
    user_request: (mode !== 'error' && mode !== 'detect-lang') ? userInput : '',
    input_a: codeA,
    input_b: codeB,
    error_message: (mode === 'error') ? userInput : '',
    osVersion: osVersion || '',
    cli: cli || '',
    knowledgeLevel: knowledgeLevel || 'intermediate',
    deviceType: deviceType || '',
    existingCommands: existingCommands || [],
    analysis: analysis || ''
  };

  try {
    const rawOutput = await fetchCCGResponse(apiParams);

    if (rawOutput.startsWith('⚠️')) {
      toast.error(rawOutput);
      return null;
    }

    const finalData = parseAndConstructData(rawOutput, mode, cli);
    if (!finalData) {
      toast.error(t.errorParse);
      return null;
    }

    const result = { type: mode, data: finalData };
    sessionCache.set(cacheKey, result);
    return result;

  } catch (err) {
    handleError(err, lang);
    return null;
  }
};
