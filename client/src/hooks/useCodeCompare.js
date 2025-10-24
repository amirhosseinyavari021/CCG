import { useReducer } from 'react';
import { callApi } from '../api/promptService'; // For AI analysis
import toast from 'react-hot-toast';

// Reducer for complex state management
const initialState = {
    isLoading: false,
    error: null,
    result: null,
};

function compareReducer(state, action) {
    switch (action.type) {
        case 'START_COMPARE':
            return { ...initialState, isLoading: true };
        case 'SET_RESULTS':
            return { ...initialState, isLoading: false, result: action.payload };
        case 'SET_ERROR':
            return { ...initialState, error: action.payload };
        default:
            return state;
    }
}

export const useCodeCompare = (lang, t) => {
    const [state, dispatch] = useReducer(compareReducer, initialState);

    // Helper for AI calls
    const runAiTask = async (mode, options = {}) => {
        // --- FIXED: Added userInput: 'analyze' ---
        // This ensures the payload to /api/proxy is valid, as userInput is required by callApi
        // -- UPDATED to pass all options --
        const result = await callApi({ mode, lang, userInput: 'analyze', ...options });
        return result?.data?.explanation || result?.data?.cause || null;
    };

    // Main comparison function
    // --- UPDATED to run sequentially for better quality merge ---
    const runCompare = async (codeA, codeB) => {
        dispatch({ type: 'START_COMPARE' });

        try {
            // 1. Detect Languages in parallel
            const [langA, langB] = await Promise.all([
                runAiTask('detect-lang', { codeA }),
                runAiTask('detect-lang', { codeA: codeB }) // Use codeA as the generic param
            ]);

            // 2. Run analysis (diff and quality) in parallel
            const [diffAnalysis, qualityAnalysis] = await Promise.all([
                runAiTask('compare-diff', { codeA, codeB, langA, langB }),
                runAiTask('compare-quality', { codeA, codeB, langA, langB })
            ]);

            // 3. Create a combined analysis report for the merge task
            const analysisReport = `
--- Logical Differences ---
${diffAnalysis || 'N/A'}

--- Code Quality Review ---
${qualityAnalysis || 'N/A'}
`;

            // 4. Run merge task *using* the analysis from step 2
            const merge = await runAiTask('compare-merge', {
                codeA,
                codeB,
                langA,
                langB,
                analysis: analysisReport
            });


            // 5. Set results
            dispatch({
                type: 'SET_RESULTS',
                payload: {
                    langA,
                    langB,
                    diffAnalysis,
                    qualityAnalysis,
                    merge
                }
            });

        } catch (err) {
            const errorMessage = err.message || t.errorDefault;
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
            toast.error(errorMessage);
        }
    };

    return { state, runCompare };
};