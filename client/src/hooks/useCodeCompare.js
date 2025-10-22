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
            // Corrected: ...initialState to ensure old results are cleared
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
        const result = await callApi({ mode, lang, ...options });
        // The parser returns 'explanation' for simple text, or 'cause'
        return result?.data?.explanation || result?.data?.cause || null;
    };

    // Main comparison function
    const runCompare = async (codeA, codeB) => {
        dispatch({ type: 'START_COMPARE' });

        try {
            // 1. Detect Languages in parallel
            const [langA, langB] = await Promise.all([
                runAiTask('detect-lang', { codeA }),
                runAiTask('detect-lang', { codeA: codeB }) // Use codeA as the generic param
            ]);

            // 2. Run analysis and merge in parallel
            // Pass an empty analysis string to the merge task for now
            const [diffAnalysis, qualityAnalysis, merge] = await Promise.all([
                runAiTask('compare-diff', { codeA, codeB, langA, langB }),
                runAiTask('compare-quality', { codeA, codeB, langA, langB }),
                runAiTask('compare-merge', { codeA, codeB, langA, langB, analysis: '' })
            ]);

            // 3. Set results
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
