import axios from 'axios';

/**
 * Handles communication between the React web client and
 * the backend proxy connected to the CCG AI Assistant.
 *
 * @param {object} params - An object containing all user parameters.
 * @returns {Promise<string>} The AI's direct string output or an error message.
 */
export async function fetchCCGResponse(params) {
    const payload = {
        prompt: {
            id: 'pmpt_68fa6a905dac8195b749aa47ea94d4d8001f6f48395546cd',
            version: '9',
            variables: {
                mode: params.mode || '',
                os: params.os || '',
                lang: params.lang || '',
                user_request: params.user_request || '',
                input_a: params.input_a || '',
                input_b: params.input_b || '',
                error_message: params.error_message || ''
            }
        }
    };

    const token = typeof window !== 'undefined'
        ? window.localStorage.getItem('ccg_token')
        : null;

    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const handleApiError = (error) => {
        console.error('CCG Web API error:', error);

        if (error.response) {
            const { status, data } = error.response;

            if (status === 401) {
                return '⚠️ برای استفاده از CCG ابتدا باید وارد حساب کاربری شوید.';
            }

            if (status === 429) {
                return data?.error || '⚠️ سقف استفاده امروز پلن رایگان شما تمام شده است.';
            }

            if (data?.error?.message) {
                return `⚠️ ${data.error.message}`;
            }

            return '⚠️ خطایی در ارتباط با سرور CCG رخ داد.';
        }

        if (error.request) {
            return '⚠️ ارتباط با سرور برقرار نشد. اتصال اینترنت یا سرور را بررسی کنید.';
        }

        return '⚠️ یک خطای ناشناخته هنگام تماس با سرویس CCG رخ داد.';
    };

    try {
        const response = await axios.post('/api/ccg', payload, {
            timeout: 30000,
            headers
        });
        return response.data.output;
    } catch (error) {
        return handleApiError(error);
    }
}
