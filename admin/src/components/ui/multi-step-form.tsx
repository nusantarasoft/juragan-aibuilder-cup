'use client';
import { cn } from '@/lib/utils';
import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Step {
    title: string;
    description?: string;
    content?: ReactNode;
}

interface MultiStepFormProps {
    steps?: Step[];
    className?: string;
    children?: ReactNode;
    onComplete?: () => void;
    onSubmit?: (data: Record<string, unknown>) => void;
}

export function MultiStepForm({
    steps = [],
    className,
    children,
    onComplete,
    onSubmit
}: MultiStepFormProps) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else if (onComplete) {
            onComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (children) {
        return <div className={cn('space-y-4', className)}>{children}</div>;
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Progress */}
            <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-center">
                        <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                            index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        )}>
                            {index + 1}
                        </div>
                        {index < steps.length - 1 && (
                            <div className={cn(
                                'h-1 w-12',
                                index < currentStep ? 'bg-primary' : 'bg-muted'
                            )} />
                        )}
                    </div>
                ))}
            </div>

            {/* Current step content */}
            <div className="min-h-[200px]">
                {steps[currentStep]?.content || (
                    <div>
                        <h3 className="text-lg font-semibold">{steps[currentStep]?.title}</h3>
                        <p className="text-muted-foreground">{steps[currentStep]?.description}</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                >
                    Previous
                </Button>
                <Button onClick={handleNext}>
                    {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
                </Button>
            </div>
        </div>
    );
}

export default MultiStepForm;
