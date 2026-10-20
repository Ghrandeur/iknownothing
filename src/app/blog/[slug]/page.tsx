import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { blogPosts } from "@/lib/site-content";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | NLQI Journal`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) notFound();

  return (
    <article className="min-h-screen bg-nlqi-cream pb-20 pt-32 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-nlqi-green hover:text-[#a58225]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to journal
        </Link>
        <header className="mx-auto mb-10 mt-12 max-w-3xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a58225]">
            {post.category} <span className="px-2 text-nlqi-green/25">/</span> {post.readTime}
          </p>
          <h1 className="mt-5 font-serif text-4xl leading-tight text-nlqi-green sm:text-6xl">{post.title}</h1>
          <p className="mt-5 text-sm leading-7 text-nlqi-charcoal/65 sm:text-base">{post.excerpt}</p>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-nlqi-charcoal/45">
            {post.date}
          </p>
        </header>
        <div className="relative mx-auto aspect-[16/8] max-w-5xl overflow-hidden rounded-2xl">
          <Image
            src={post.image}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 80vw"
            className="object-cover"
          />
        </div>
        <div className="mx-auto mt-12 max-w-2xl">
          {post.body.map((paragraph) => (
            <p key={paragraph} className="mb-6 text-base leading-8 text-nlqi-charcoal/75">
              {paragraph}
            </p>
          ))}
          <div className="mt-12 border-t border-nlqi-green/15 pt-8">
            <p className="font-serif text-2xl italic text-nlqi-green">
              “Beauty becomes powerful when purpose gives it direction.”
            </p>
            <Link
              href="/apply"
              className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-nlqi-green"
            >
              Find your place in the story <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
