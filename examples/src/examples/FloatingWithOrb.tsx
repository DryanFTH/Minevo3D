import { useRef } from 'react';

import { CylinderGeometry, Mesh, MeshLambertMaterial } from 'three';

import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';
import { CylinderGeometry, Mesh, MeshLambertMaterial } from 'three';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    animation: 'float',
    camera: { azimuth: 30 },
});
const orb = new Mesh(
    new CylinderGeometry(2.4, 2.4, 0.8, 8),
    new MeshLambertMaterial({ color: 0xf2c230, emissive: 0x3a2c00 }),
);
viewer.scene.add(orb);

viewer.onFrame(({ viewer, delta }) => {
    const hand = viewer.rig.getJointWorldPosition('armR', 'end');
    orb.position.set(hand.x, hand.y + 2.6, hand.z);
    orb.rotation.y += delta * 1.2;
});

viewer.dispose();`;

const reactCode = `import { useRef } from 'react';
import { CylinderGeometry, Mesh, MeshLambertMaterial } from 'three';
import { ReactMinevo3D } from 'minevo3d/react';

export function FloatingWithOrbExample() {
    const orbRef = useRef<Mesh | null>(null);

    return (
        <div className='h-115 w-90'>
            <ReactMinevo3D
                animation='float'
                camera={{ azimuth: 30 }}
                onReady={viewer => {
                    const orb = new Mesh(
                        new CylinderGeometry(2.4, 2.4, 0.8, 8),
                        new MeshLambertMaterial({ color: 0xf2c230, emissive: 0x3a2c00 }),
                    );
                    viewer.scene.add(orb);
                    orbRef.current = orb;
                }}
                onFrame={({ viewer, delta }) => {
                    const orb = orbRef.current;
                    if (!orb) return;

                    const hand = viewer.rig.getJointWorldPosition('armR', 'end');
                    orb.position.set(hand.x, hand.y + 2.6, hand.z);
                    orb.rotation.y += delta * 1.2;
                }}
            />
        </div>
    );
}`;

export function FloatingWithOrb() {
    const orbRef = useRef<Mesh | null>(null);

    return (
        <ExampleTemplate
            number={7}
            category='Animation'
            title='Float with an orb'
            description='Add a Three.js mesh to the scene and update its position each frame to spin the orb above the character’s right hand.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-115 w-90'>
                    <ReactMinevo3D
                        animation='float'
                        camera={{ azimuth: 30 }}
                        onReady={viewer => {
                            const orb = new Mesh(
                                new CylinderGeometry(2.4, 2.4, 0.8, 8),
                                new MeshLambertMaterial({
                                    color: 0xf2c230,
                                    emissive: 0x3a2c00,
                                }),
                            );
                            viewer.scene.add(orb);
                            orbRef.current = orb;
                        }}
                        onFrame={({ viewer, delta }) => {
                            const orb = orbRef.current;
                            if (!orb) return;

                            const hand = viewer.rig.getJointWorldPosition('armR', 'end');
                            orb.position.set(hand.x, hand.y + 2.6, hand.z);
                            orb.rotation.y += delta * 1.2;
                        }}
                    />
                </div>
            }
        />
    );
}
