'use client';
import { cn } from '@/lib/utils';

interface PhoneMockupProps {
    children?: React.ReactNode;
    className?: string;
    src?: string;
    imageUrl?: string;
    alt?: string;
    glowColor?: string;
}

export function PhoneMockup({ children, className, src, imageUrl, alt = 'Phone', glowColor }: PhoneMockupProps) {
    const imageSrc = imageUrl || src;
    return (
        <div className={cn(
            'relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[280px] shadow-xl',
            className
        )}>
            <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute" />
            <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg" />
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg" />
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg" />
            <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg" />
            <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-gray-800">
                {imageSrc ? <img src={imageSrc} className="w-full h-full object-cover" alt={alt} /> : children}
            </div>
        </div>
    );
}

export default PhoneMockup;
