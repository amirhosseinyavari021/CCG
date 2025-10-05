import React, { useState, useEffect } from 'react';
import CustomSelect from './common/CustomSelect';
import CustomInput from './common/CustomInput';
import { Button, Flex, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { t } from '../constants/translations';
import osDetails from '../constants/osDetails';

const Form = ({ onSubmit, onExplain, isLoading, loadingMessage, lang, activeTab, setActiveTab }) => {
  const [os, setOs] = useState('linux');
  const [osVersion, setOsVersion] = useState('');
  const [cli, setCli] = useState('');
  const [userInput, setUserInput] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [customOsName, setCustomOsName] = useState('');
  const [customOsVersion, setCustomOsVersion] = useState('');

  useEffect(() => {
    if (osDetails[os]) {
      setOsVersion(osDetails[os].versions[0]);
      setCli(osDetails[os].clis[0]);
      setCustomOsName('');
      setCustomOsVersion('');
    } else if (os === 'other') {
      setCli(osDetails.other.clis[0]);
      setOsVersion(''); // Clear version when switching to other
    }
  }, [os]);

  const validateAndSubmit = (handler) => {
    const newErrors = {};
    if (!userInput.trim()) newErrors.userInput = t.fieldRequired;

    if (os === 'other') {
      if (!customOsName.trim()) newErrors.customOsName = t.fieldRequired;
      if (!customOsVersion.trim()) newErrors.customOsVersion = t.fieldRequired;
    }

    setFormErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      let finalOs = os;
      let finalOsVersion = osVersion;

      if (os === 'other') {
        finalOs = customOsName.trim();
        finalOsVersion = customOsVersion.trim();
      }

      handler({ os: finalOs, osVersion: finalOsVersion, cli, userInput });
    }
  };

  const osOptions = [...Object.keys(osDetails).filter(k => k !== 'other'), 'other'];

  return (
    <VStack spacing={6} w="full">
      <Text fontSize="lg" fontWeight="bold" color={useColorModeValue('gray.700', 'gray.200')}>
        {t.formTitle}
      </Text>

      {/* Tabs */}
      <Flex gap={2} mb={4}>
        <Button
          onClick={() => setActiveTab('generate')}
          colorScheme={activeTab === 'generate' ? 'teal' : 'gray'}
          variant={activeTab === 'generate' ? 'solid' : 'outline'}
          size="sm"
        >
          {t.generateCommands}
        </Button>
        <Button
          onClick={() => setActiveTab('script')}
          colorScheme={activeTab === 'script' ? 'blue' : 'gray'}
          variant={activeTab === 'script' ? 'solid' : 'outline'}
          size="sm"
        >
          {t.generateScript}
        </Button>
        <Button
          onClick={() => setActiveTab('analyze')}
          colorScheme={activeTab === 'analyze' ? 'orange' : 'gray'}
          variant={activeTab === 'analyze' ? 'solid' : 'outline'}
          size="sm"
        >
          {t.analyzeCommand}
        </Button>
        <Button
          onClick={() => setActiveTab('explain')}
          colorScheme={activeTab === 'explain' ? 'purple' : 'gray'}
          variant={activeTab === 'explain' ? 'solid' : 'outline'}
          size="sm"
        >
          {t.explainCommand}
        </Button>
      </Flex>

      <CustomSelect
        label={t.osLabel}
        value={os}
        onChange={(e) => setOs(e.target.value)}
        options={osOptions.map(opt => ({
          value: opt,
          label: opt === 'other' ? t.osOther : opt.charAt(0).toUpperCase() + opt.slice(1)
        }))}
        error={formErrors.os}
      />

      {os === 'other' ? (
        <>
          <CustomInput
            label={t.customOsNameLabel}
            value={customOsName}
            onChange={(e) => setCustomOsName(e.target.value)}
            placeholder={t.customOsNamePlaceholder}
            error={formErrors.customOsName}
          />
          <CustomInput
            label={t.customOsVersionLabel}
            value={customOsVersion}
            onChange={(e) => setCustomOsVersion(e.target.value)}
            placeholder={t.customOsVersionPlaceholder}
            error={formErrors.customOsVersion}
          />
        </>
      ) : (
        <CustomSelect
          label={t.osVersionLabel}
          value={osVersion}
          onChange={(e) => setOsVersion(e.target.value)}
          options={osDetails[os]?.versions.map(ver => ({ value: ver, label: ver })) || []}
          error={formErrors.osVersion}
        />
      )}

      <CustomSelect
        label={t.cliLabel}
        value={cli}
        onChange={(e) => setCli(e.target.value)}
        options={
          os === 'other'
            ? osDetails.other.clis.map(cli => ({ value: cli, label: cli }))
            : osDetails[os]?.clis.map(cli => ({ value: cli, label: cli }))
        }
        error={formErrors.cli}
      />

      <CustomInput
        label={t.requestLabel}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={t.requestPlaceholder}
        error={formErrors.userInput}
        isTextarea
      />

      <Flex gap={4} w="full">
        <Button
          onClick={() => validateAndSubmit(onSubmit)}
          colorScheme={activeTab === 'generate' ? 'teal' : activeTab === 'script' ? 'blue' : activeTab === 'analyze' ? 'orange' : 'purple'}
          isLoading={isLoading}
          loadingText={loadingMessage}
          isDisabled={isLoading}
          w="full"
        >
          {activeTab === 'generate' ? t.generateButton : activeTab === 'script' ? t.scriptButton : activeTab === 'analyze' ? t.analyzeButton : t.explainButton}
        </Button>
      </Flex>
    </VStack>
  );
};

export default Form;
