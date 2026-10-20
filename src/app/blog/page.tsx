import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { blogPosts } from "@/lib/site-content";

export default function BlogPage() {
  const [featured, ...stories] = blogPosts;

  return (
    <div className="min-h-screen bg-nlqi-cream pb-20 pt-32 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="mb-12 max-w-3xl sm:mb-16">
          <p className="editorial-label">The NLQI journal</p>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-nlqi-green sm:text-7xl">
            Ideas into <span className="italic text-[#a58225]">impact.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-nlqi-charcoal/65 sm:text-base">
            Perspectives on purpose, leadership and the women shaping a more
            intentional future.
          </p>
        </div>

        <article className="grid overflow-hidden rounded-2xl bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <Link
            href={`/blog/${featured.slug}`}
            className="group relative min-h-[320px] overflow-hidden sm:min-h-[450px]"
            aria-label={`Read ${featured.title}`}
          >
            <Image
              src={featured.image}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </Link>
          <div className="flex flex-col justify-center p-7 sm:p-12 lg:p-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a58225]">
              {featured.category} <span className="px-2 text-nlqi-green/25">/</span> {featured.readTime}
            </p>
            <h2 className="mt-5 font-serif text-3xl leading-tight text-nlqi-green sm:text-4xl">
              {featured.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-nlqi-charcoal/65">{featured.excerpt}</p>
            <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.14em] text-nlqi-charcoal/45">
              {featured.date}
            </p>
            <Link
              href={`/blog/${featured.slug}`}
              className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-nlqi-green"
            >
              Read the story <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </article>

        <div className="mb-7 mt-16 flex items-center justify-between border-b border-nlqi-green/15 pb-4">
          <h2 className="font-serif text-2xl text-nlqi-green">More from the journal</h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-nlqi-charcoal/45">Perspectives & stories</span>
        </div>
        <div className="grid gap-7 md:grid-cols-2">
          {stories.map((post) => (
            <article key={post.slug} className="group">
              <Link
                href={`/blog/${post.slug}`}
                className="relative block aspect-[16/9] overflow-hidden rounded-2xl bg-nlqi-green"
                aria-label={`Read ${post.title}`}
              >
                <Image
                  src={post.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </Link>
              <div className="mt-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#a58225]">
                {post.category} <span className="h-px w-5 bg-nlqi-gold/60" /> {post.readTime}
              </div>
              <h3 className="mt-3 font-serif text-2xl text-nlqi-green">
                <Link href={`/blog/${post.slug}`} className="hover:text-[#a58225]">
                  {post.title}
                </Link>
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-7 text-nlqi-charcoal/65">{post.excerpt}</p>
            </article>
          ))}
        </div>
        <p className="mt-12 text-center text-[10px] leading-5 text-nlqi-charcoal/45">
          Sample editorial content for this concept preview. Replace with NLQI-approved stories before publication.
        </p>
      </div>
    </div>
  );
}
