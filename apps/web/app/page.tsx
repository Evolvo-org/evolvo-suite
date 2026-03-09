import type { Link } from '@repo/api/entities/link.entity';
import { Button } from '@repo/ui/components/button/button';
import Image, { type ImageProps } from 'next/image';

type Props = Omit<ImageProps, 'src'> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;

  return (
    <>
      <Image {...rest} src={srcLight} className="dark:hidden" />
      <Image {...rest} src={srcDark} className="hidden dark:block" />
    </>
  );
};

async function getLinks(): Promise<Link[]> {
  try {
    const res = await fetch('http://localhost:3000/links', {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch links');
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching links:', error);
    return [];
  }
}

export default async function Home() {
  const links = await getLinks();

  return (
    <div className="grid min-h-svh grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-20 font-sans max-md:p-8 max-md:pb-20">
      <main className="row-start-2 flex flex-col gap-8 max-md:items-center">
        <ThemeImage
          className="dark:invert"
          srcLight="turborepo-dark.svg"
          srcDark="turborepo-light.svg"
          alt="Turborepo logo"
          width={180}
          height={38}
          priority
        />
        <ol className="m-0 list-inside space-y-2 p-0 font-mono text-sm leading-6 tracking-[-0.01em] max-md:text-center">
          <li>
            Get started by editing{' '}
            <code className="rounded bg-black/5 px-1 py-0.5 font-semibold dark:bg-white/10">
              apps/web/app/page.tsx
            </code>
          </li>
          <li>Save and see your changes instantly.</li>
        </ol>

        <div className="flex gap-4 max-md:flex-col">
          <a
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-transparent bg-black px-5 text-base leading-5 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 max-md:h-10 max-md:px-4 max-md:text-sm"
            href="https://vercel.com/new/clone?demo-description=Learn+to+implement+a+monorepo+with+a+two+Next.js+sites+that+has+installed+three+local+packages.&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2F4K8ZISWAzJ8X1504ca0zmC%2F0b21a1c6246add355e55816278ef54bc%2FBasic.png&demo-title=Monorepo+with+Turborepo&demo-url=https%3A%2F%2Fexamples-basic-web.vercel.sh%2F&from=templates&project-name=Monorepo+with+Turborepo&repository-name=monorepo-turborepo&repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fturborepo%2Ftree%2Fmain%2Fexamples%2Fbasic&root-directory=apps%2Fdocs&skippable-integrations=1&teamSlug=vercel&utm_source=create-turbo"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            href="https://turborepo.dev/docs?utm_source"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 min-w-44 items-center justify-center rounded-full border border-black/10 px-5 text-base leading-5 font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10 max-md:h-10 max-md:min-w-0 max-md:px-4 max-md:text-sm"
          >
            Read our docs
          </a>
        </div>

        <Button
          appName="web"
          className="h-12 min-w-44 rounded-full border border-black/10 px-5 text-base leading-5 font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10 max-md:h-10 max-md:min-w-0 max-md:px-4 max-md:text-sm"
        >
          Open alert
        </Button>

        {links.length > 0 ? (
          <div className="flex gap-4 max-md:flex-col">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.description}
                className="flex h-12 min-w-44 items-center justify-center rounded-full border border-black/10 px-5 text-base leading-5 font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10 max-md:h-10 max-md:min-w-0 max-md:px-4 max-md:text-sm"
              >
                {link.title}
              </a>
            ))}
          </div>
        ) : (
          <div className="text-zinc-500 dark:text-zinc-400">
            No links available. Make sure the NestJS API is running on port
            3000.
          </div>
        )}
      </main>

      <footer className="row-start-3 flex gap-6 max-md:flex-wrap max-md:justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?search=turborepo&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://turborepo.dev?utm_source=create-turbo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to turborepo.dev →
        </a>
      </footer>
    </div>
  );
}
