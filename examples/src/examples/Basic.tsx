import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container);

// Call this when the viewer element is removed.
viewer.dispose();`;

const reactCode = `import { ReactMinevo3D } from 'minevo3d/react';

export function BasicExample() {
    return (
        <div className='h-105 w-80'>
            <ReactMinevo3D />
        </div>
    );
}`;

export function Basic() {
    return (
        <ExampleTemplate
            number={1}
            category='Getting started'
            title='Your first character'
            description='Display a Minecraft character with the default settings. Give the container a height so the viewer is visible.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D />
                </div>
            }
        />
    );
}
