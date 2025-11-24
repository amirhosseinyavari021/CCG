import React from 'react';
import { LoaderCircle } from 'lucide-react';

const LoadingSpinner = ({ className = "" }) => {
    return <LoaderCircle className={`animate-spin ${className}`} />;
};

export default LoadingSpinner;
