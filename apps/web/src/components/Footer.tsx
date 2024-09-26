import { IconTwitterX, IconDiscord, IconGithub } from "./Icons";

export function Footer() {
    return (
        <footer className="w-full flex justify-center space-x-4">
            <a href="https://github.com/helius-labs/airship" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300">
                <IconGithub size={24} />
            </a>
            <a href="https://twitter.com/heliuslabs" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300">
                <IconTwitterX size={24} />
            </a>
            <a href="https://discord.com/invite/aYjmtWsy6b" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300">
                <IconDiscord size={24} />
            </a>
        </footer>
    );
}

