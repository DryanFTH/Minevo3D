import { type ComponentType, useMemo, useState } from 'react';

import { AutoRotateImperative } from './examples/AutoRotateImperative';
import { AutoRotateShowcase } from './examples/AutoRotateShowcase';
import { Basic } from './examples/Basic';
import { CameraAnimations } from './examples/CameraAnimations';
import { CapeAnimated } from './examples/CapeAnimated';
import { CapeImperative } from './examples/CapeImperative';
import { CapeProp } from './examples/CapeProp';
import { CheapLighting } from './examples/CheapLighting';
import { CustomFunction } from './examples/CustomFunction';
import { FloatingWithOrb } from './examples/FloatingWithOrb';
import { Imperative } from './examples/Imperative';
import { LightingToggles } from './examples/LightingToggles';
import { LookAtPointer } from './examples/LookAtPointer';
import { Registry } from './examples/Registry';
import { SkinSources } from './examples/SkinSources';
import { SkinSwitcherImperative } from './examples/SkinSwitcherImperative';
import { SkinSwitcherProp } from './examples/SkinSwitcherProp';
import { SkinUploader } from './examples/SkinUploader';
import { SwitchAnimation } from './examples/SwitchAnimation';
import { ZoomAndFov } from './examples/ZoomAndFov';
import { ZoomWithTransition } from './examples/ZoomWithTransition';
import { cn } from './lib/cn';

type ExampleItem = {
    name: string;
    num: number;
    title: string;
    category: string;
    Component: ComponentType;
};

const items: ExampleItem[] = [
    {
        num: 1,
        name: 'Basic',
        title: 'Your first character',
        category: 'Getting started',
        Component: Basic,
    },
    {
        num: 2,
        name: 'SwitchAnimation',
        title: 'Change animation',
        category: 'Animation',
        Component: SwitchAnimation,
    },
    {
        num: 3,
        name: 'CustomFunction',
        title: 'Custom animation',
        category: 'Animation',
        Component: CustomFunction,
    },
    {
        num: 4,
        name: 'Registry',
        title: 'Animation registry',
        category: 'Animation',
        Component: Registry,
    },
    {
        num: 5,
        name: 'LookAtPointer',
        title: 'Head follows the pointer',
        category: 'Pose & rigging',
        Component: LookAtPointer,
    },
    {
        num: 6,
        name: 'SkinUploader',
        title: 'Upload a skin',
        category: 'Skins & capes',
        Component: SkinUploader,
    },
    {
        num: 7,
        name: 'SkinSources',
        title: 'Skin sources',
        category: 'Skins & capes',
        Component: SkinSources,
    },
    {
        num: 8,
        name: 'FloatingWithOrb',
        title: 'Pose with a 3D object',
        category: 'Pose & rigging',
        Component: FloatingWithOrb,
    },
    {
        num: 9,
        name: 'Imperative',
        title: 'Control with a ref',
        category: 'Controls',
        Component: Imperative,
    },
    {
        num: 10,
        name: 'ZoomAndFov',
        title: 'Zoom and field of view',
        category: 'Camera',
        Component: ZoomAndFov,
    },
    {
        num: 11,
        name: 'CameraAnimations',
        title: 'Camera animations',
        category: 'Camera',
        Component: CameraAnimations,
    },
    {
        num: 12,
        name: 'ZoomWithTransition',
        title: 'Zoom transition',
        category: 'Camera',
        Component: ZoomWithTransition,
    },
    {
        num: 13,
        name: 'LightingToggles',
        title: 'Lighting controls',
        category: 'Lighting',
        Component: LightingToggles,
    },
    {
        num: 14,
        name: 'CheapLighting',
        title: 'Low-cost lighting',
        category: 'Lighting',
        Component: CheapLighting,
    },
    {
        num: 15,
        name: 'AutoRotateShowcase',
        title: 'Auto-rotate',
        category: 'Camera',
        Component: AutoRotateShowcase,
    },
    {
        num: 16,
        name: 'AutoRotateImperative',
        title: 'Control rotation with a ref',
        category: 'Camera',
        Component: AutoRotateImperative,
    },
    {
        num: 17,
        name: 'SkinSwitcherProp',
        title: 'Change skin with props',
        category: 'Skins & capes',
        Component: SkinSwitcherProp,
    },
    {
        num: 18,
        name: 'SkinSwitcherImperative',
        title: 'Change skin with a ref',
        category: 'Skins & capes',
        Component: SkinSwitcherImperative,
    },
    {
        num: 19,
        name: 'CapeProp',
        title: 'Set cape with props',
        category: 'Skins & capes',
        Component: CapeProp,
    },
    {
        num: 20,
        name: 'CapeImperative',
        title: 'Set cape with a ref',
        category: 'Skins & capes',
        Component: CapeImperative,
    },
    {
        num: 21,
        name: 'CapeAnimated',
        title: 'Cape follows the animation',
        category: 'Skins & capes',
        Component: CapeAnimated,
    },
];

export function App() {
    const [name, setName] = useState(() => {
        const fromHash = decodeURIComponent(location.hash.slice(1));
        return items.some(item => item.name === fromHash) ? fromHash : items[0]?.name;
    });
    const [search, setSearch] = useState('');
    const current = items.find(item => item.name === name) ?? items[0];
    const groups = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        const filtered = items.filter(item =>
            `${item.title} ${item.name} ${item.category}`
                .toLocaleLowerCase()
                .includes(query),
        );

        return filtered.reduce<Record<string, ExampleItem[]>>((result, item) => {
            (result[item.category] ??= []).push(item);
            return result;
        }, {});
    }, [search]);

    const select = (nextName: string) => {
        setName(nextName);
        history.replaceState(null, '', `#${encodeURIComponent(nextName)}`);
    };

    return (
        <div
            className={cn(
                'flex min-h-full max-[760px]:flex-col',
                'bg-[#14161c] text-sm leading-normal text-[#e6e8ee]',
                'font-[system-ui,-apple-system,"Segoe_UI",Roboto,sans-serif]',
                'scheme-dark *:box-border',
            )}
        >
            <aside
                className={cn(
                    'w-70 shrink-0 overflow-y-auto',
                    'border-r border-[#2a2e3a] bg-[#1b1e26]',
                    'px-3.5 py-5.5',
                    'max-[760px]:max-h-[38vh] max-[760px]:w-full',
                    'max-[760px]:border-r-0 max-[760px]:border-b',
                )}
            >
                <a
                    className='block text-[19px] font-bold text-[#e6e8ee] no-underline'
                    href='#Basic'
                >
                    Minevo3D <span className='text-[#5ad17a]'>Examples</span>
                </a>
                <p className='mt-0.75 mb-5 text-xs text-[#8b91a3]'>
                    Explore {items.length} interactive examples
                </p>
                <label
                    className='mb-1.5 block text-xs text-[#8b91a3]'
                    htmlFor='example-search'
                >
                    Search examples
                </label>
                <input
                    id='example-search'
                    className='mb-3.5 w-full px-2.5 py-2.25'
                    type='search'
                    placeholder='Animation, skin, camera...'
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                />
                <nav
                    className={cn(
                        'flex flex-col gap-0.5',
                        'max-[760px]:grid',
                        'max-[760px]:grid-cols-[repeat(auto-fit,minmax(175px,1fr))]',
                    )}
                    aria-label='Example list'
                >
                    {Object.entries(groups).map(([category, examples]) => (
                        <div className='mb-3.5 max-[760px]:mb-2' key={category}>
                            <h2
                                className={cn(
                                    'mb-1.25 ml-2 text-[11px] font-semibold uppercase',
                                    'tracking-[0.08em] text-[#8b91a3]',
                                )}
                            >
                                {category}
                            </h2>
                            {examples.map(item => (
                                <button
                                    key={item.name}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded-md',
                                        'border-0 bg-transparent px-2 py-1.5 text-left',
                                        'text-[#e6e8ee] hover:bg-[#242836]',
                                        item.name === current?.name &&
                                            'bg-[#1f3b2a] text-[#5ad17a]',
                                    )}
                                    onClick={() => select(item.name)}
                                >
                                    <span className='w-6 shrink-0 text-[11px] tabular-nums text-[#8b91a3]'>
                                        {String(item.num).padStart(2, '0')}
                                    </span>
                                    <span>{item.title}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                    {Object.keys(groups).length === 0 && (
                        <p className='p-2 text-[#8b91a3]'>No examples found.</p>
                    )}
                </nav>
            </aside>
            <main
                className={cn(
                    'min-w-0 flex-1',
                    'px-[clamp(20px,5vw,72px)] py-9.5',
                    'max-[760px]:px-4 max-[760px]:py-6',
                )}
            >
                {current && <current.Component />}
            </main>
        </div>
    );
}
