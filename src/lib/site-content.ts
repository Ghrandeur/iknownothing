export const siteImages = {
  queen:
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1400&q=85",
  portrait:
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85",
  leadership:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=85",
  mentorship:
    "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1000&q=85",
  community:
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=85",
  education:
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=85",
  conversation:
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=85",
};

export const blogPosts = [
  {
    slug: "mental-renaissance",
    title: "The Mental Renaissance Movement",
    excerpt:
      "Why NLQI is shifting the conversation from beauty alone to purpose-driven leadership.",
    image: siteImages.leadership,
    date: "Editorial preview",
    category: "Our philosophy",
    readTime: "4 min read",
    body: [
      "A crown can open a door. What a woman knows, believes and chooses to do with that opportunity is what changes the world beyond it.",
      "Mental Renaissance is NLQI's commitment to a fuller idea of excellence: one that makes room for intellect, confidence, compassion and the courage to lead. It is a platform where ambition is strengthened by service and visibility is matched with responsibility.",
      "Through mentorship, advocacy and leadership development, contestants build the skills to make their causes tangible. The experience is designed to keep working long after the final walk—because the legacy is the work women continue to do in their communities.",
    ],
  },
  {
    slug: "advocacy-through-pageantry",
    title: "Advocacy Through Pageantry",
    excerpt:
      "How contestants turn their platforms into community transformation projects.",
    image: siteImages.community,
    date: "Editorial preview",
    category: "Community",
    readTime: "3 min read",
    body: [
      "Advocacy starts with listening. The strongest ideas grow from understanding what a community needs and working alongside the people already creating change.",
      "At NLQI, contestants are encouraged to shape a cause into a clear, practical project. Education, mental wellbeing, women’s opportunity and youth development are among the many areas where informed, consistent action can make a difference.",
      "The pageant platform helps bring attention to that work. Mentorship and peer support help contestants turn attention into meaningful partnerships and long-term commitment.",
    ],
  },
  {
    slug: "meet-the-legacy-queens",
    title: "Meet the Legacy Queens",
    excerpt:
      "Stories of women who carry leadership, service and purpose beyond the stage.",
    image: siteImages.queen,
    date: "Editorial preview",
    category: "People",
    readTime: "5 min read",
    body: [
      "Every legacy begins with a choice: to use your voice, skills and opportunities in service of something larger than yourself.",
      "The NLQI journey celebrates women with different stories and ambitions. What unites them is a willingness to learn, to show up for their communities and to turn personal growth into shared progress.",
      "Their work reminds us that leadership is not a single moment on a stage. It is the everyday practice of listening, building trust and creating room for others to thrive.",
    ],
  },
] as const;
