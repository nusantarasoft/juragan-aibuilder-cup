'use client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PricingCardProps {
    title?: string;
    name?: string;
    price: string | number;
    period?: string;
    description?: string;
    features?: string[];
    className?: string;
    popular?: boolean;
    featured?: boolean;
    key?: string;
}

export function PricingCard({
    title,
    name,
    price,
    period,
    description,
    features = [],
    className,
    popular = false,
    featured = false
}: PricingCardProps) {
    const displayTitle = title || name || 'Plan';
    const displayPrice = typeof price === 'number' ? `$${price}` : price;
    const isHighlighted = popular || featured;

    return (
        <div className={cn(
            'rounded-xl border p-6',
            isHighlighted && 'border-purple-500 shadow-purple-500/20 shadow-lg',
            className
        )}>
            <h3 className="text-xl font-bold">{displayTitle}</h3>
            <div className="text-3xl font-bold my-4">
                {displayPrice}
                {period && <span className="text-sm font-normal text-muted-foreground">/{period}</span>}
            </div>
            {description && <p className="text-muted-foreground">{description}</p>}
            <ul className="space-y-2 my-4">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        {feature}
                    </li>
                ))}
            </ul>
            <Button className="w-full">Get Started</Button>
        </div>
    );
}

export default PricingCard;
