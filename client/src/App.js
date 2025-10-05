import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ChakraProvider, Box, Flex, useColorModeValue, useColorMode } from '@chakra-ui/react';
import './index.css';
import Header from './components/Header';
import Form from './components/Form';
import { callApi } from './api/apiService';
import { t } from './constants/translations';

const AboutModalLazy = lazy(() => import('./components/AboutModal'));
const MobileDrawerLazy = lazy(() => import('./components/MobileDrawer'));
const FeedbackCardLazy = lazy(() => import('./components/FeedbackCard'));

function AppContent() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [commandList, setCommandList] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    const savedLang = localStorage.getItem('lang') || 'en';
    setLang(savedLang);

    const usageCount = parseInt(localStorage.getItem('usageCount') || '0', 10);
    const feedbackRequested = localStorage.getItem('feedbackRequested') === 'true';
    if (usageCount >= 20 && !feedbackRequested) {
      setShowFeedback(true);
      localStorage.setItem('feedbackRequested', 'true');
    }
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const resetStateForNewRequest = () => {
    setCommandList([]);
    setExplanation(null);
    setIsLoading(true);
    setLoadingMessage(t.loading);
  };

  const handleGenerate = async ({ os, osVersion, cli, userInput }) => {
    resetStateForNewRequest();
    try {
      const result = await callApi({
        mode: 'generate',
        userInput,
        os,
        osVersion,
        cli,
        lang
      });
      setCommandList(result.finalData.commands || []);
      setExplanation(result.finalData.explanation || null);
    } catch (error) {
      console.error('Error generating command:', error);
      setExplanation(t.errorGenerating);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScript = async ({ os, osVersion, cli, userInput }) => {
    resetStateForNewRequest();
    try {
      const result = await callApi({
        mode: 'script',
        userInput,
        os,
        osVersion,
        cli,
        lang
      });
      setCommandList([result.finalData.scriptCode || ""]);
      setExplanation(result.finalData.explanation || null);
    } catch (error) {
      console.error('Error generating script:', error);
      setExplanation(t.errorGenerating);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async ({ os, osVersion, cli, userInput }) => {
    resetStateForNewRequest();
    try {
      const result = await callApi({
        mode: 'analyze',
        userInput,
        os,
        osVersion,
        cli,
        lang
      });
      setCommandList([]);
      setExplanation(result.finalData.explanation || null);
    } catch (error) {
      console.error('Error analyzing command:', error);
      setExplanation(t.errorAnalyzing);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplain = async ({ os, osVersion, cli, userInput }) => {
    resetStateForNewRequest();
    try {
      const result = await callApi({
        mode: 'explain',
        userInput,
        os,
        osVersion,
        cli,
        lang
      });
      setCommandList([]);
      setExplanation(result.finalData.explanation || null);
    } catch (error) {
      console.error('Error explaining command:', error);
      setExplanation(t.errorExplaining);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChakraProvider>
      <Box bg={useColorModeValue('gray.50', 'gray.900')} minHeight="100vh">
        <Header
          onLangChange={handleLangChange}
          onToggleTheme={toggleTheme}
          onOpenAbout={() => setIsAboutModalOpen(true)}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          lang={lang}
          theme={theme}
        />
        <Flex direction="column" align="center" p={8} gap={6}>
          <Box textAlign="center" mb={6}>
            <h1 className="text-4xl font-bold text-white">CMDGEN</h1>
            <p className="text-lg text-gray-300 mt-2">{t.subtitle}</p>
          </Box>

          <Box w="full" maxW="lg" p={6} bg={useColorModeValue('white', 'gray.800')} borderRadius="lg" shadow="lg">
            <Form
              onSubmit={activeTab === 'generate' ? handleGenerate : activeTab === 'script' ? handleScript : activeTab === 'analyze' ? handleAnalyze : handleExplain}
              onExplain={handleExplain}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              lang={lang}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </Box>

          {isLoading ? (
            <div className="flex justify-center items-center h-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-700 dark:text-gray-300">{loadingMessage}</span>
            </div>
          ) : (
            <>
              {commandList.length > 0 && (
                <Box
                  bg={useColorModeValue('green.50', 'green.900')}
                  p={6}
                  borderRadius="lg"
                  shadow="md"
                  maxW="lg"
                  w="full"
                >
                  <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-4">Generated Command/Script</h3>
                  <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto">
                    {commandList.map((cmd, idx) => <div key={idx}>{cmd}</div>)}
                  </pre>
                </Box>
              )}
              {explanation && commandList.length === 0 && (
                <Box
                  bg={useColorModeValue('blue.50', 'blue.900')}
                  p={6}
                  borderRadius="lg"
                  shadow="md"
                  maxW="lg"
                  w="full"
                >
                  <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">{t.explanationTitle}</h3>
                  <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: explanation }} />
                </Box>
              )}
            </>
          )}

          <Suspense fallback={<div>Loading...</div>}>
            <AboutModalLazy isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} lang={lang} />
            <MobileDrawerLazy isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} lang={lang} />
            <FeedbackCardLazy isOpen={showFeedback} onClose={() => setShowFeedback(false)} lang={lang} />
          </Suspense>
        </Flex>
      </Box>
    </ChakraProvider>
  );
}

export default AppContent;
