export const siteConfig = {
  name: "ProTech",
  description:
    "Master programming languages with expert-led courses. Build real projects. Land your dream job.",
  url: "https://protech.edu",
  links: {
    github: "https://github.com",
    twitter: "https://twitter.com",
    linkedin: "https://linkedin.com",
    discord: "https://discord.gg",
  },

  // Navigation links
  nav: {
    logo: "ProTech",
    links: [
      { label: "Home", to: "/" },
      { label: "Courses", to: "/courses" },
      { label: "About", to: "/about" },
    ],
    login: { label: "Login", to: "/auth/login" },
    register: { label: "Get Started", to: "/auth/register" },
  },

  // Hero Section Config
  hero: {
    badge: "✦ AI-Powered Learning Platform",
    titlePart1: "Master ",
    titlePart2: "Programming.",
    titlePart3: "Build Your ",
    titlePart4: "Future.",
    description:
      "ProTech offers expert-crafted courses in Python, JavaScript, TypeScript, Rust, and more. Learn by building real projects and join a thriving developer community.",
    perks: ["50,000+ students enrolled", "Expert-led curriculum", "Certificate upon completion"],
    ctaPrimary: { label: "Explore Courses", to: "/courses" },
    ctaSecondary: { label: "Watch Demo", to: "#" },
  },

  // Stats Section Config
  stats: [
    { value: "50K+", label: "Students Enrolled" },
    { value: "120+", label: "Expert Courses" },
    { value: "95%", label: "Completion Rate" },
    { value: "4.9★", label: "Average Rating" },
  ],

  // Features Section Config
  features: {
    badge: "Why ProTech?",
    title: "Everything You Need to Succeed",
    description:
      "We've built the learning environment we always wished we had. Practical, engaging, and designed for real growth.",
    items: [
      {
        title: "Expert Instructors",
        description:
          "Learn from industry veterans with 10+ years of real-world experience building production systems.",
      },
      {
        title: "Hands-on Projects",
        description:
          "Every course includes practical projects you can add to your portfolio immediately.",
      },
      {
        title: "Certificates",
        description:
          "Earn industry-recognized certificates upon completion to boost your professional profile.",
      },
      {
        title: "Lifetime Access",
        description:
          "Pay once, learn forever. All future course updates are included at no extra cost.",
      },
      {
        title: "Community Support",
        description:
          "Join a thriving Discord community of 50,000+ developers ready to help you grow.",
      },
      {
        title: "Mobile Friendly",
        description: "Learn on the go with our fully responsive platform optimized for any device.",
      },
    ],
  },

  // Testimonials Section Config
  testimonials: {
    badge: "Student Stories",
    title: "Loved by Developers Worldwide",
    description:
      "Don't just take our word for it. Here's what our students say after completing their ProTech journey.",
    items: [
      {
        id: 1,
        name: "Jordan Lee",
        role: "Software Engineer @ Google",
        avatar: "JL",
        avatarClass: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900",
        rating: 5,
        quote:
          "ProTech's TypeScript course completely changed how I write code. The real-world projects and expert feedback were invaluable. I landed my dream job 2 months after completing the advanced track.",
      },
      {
        id: 2,
        name: "Priya Sharma",
        role: "Full-Stack Developer @ Startup",
        avatar: "PS",
        avatarClass: "bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900",
        rating: 5,
        quote:
          "The Python Mastery course is hands-down the best investment I've made in my career. The curriculum is up-to-date, the instructors are brilliant, and the community is incredibly supportive.",
      },
      {
        id: 3,
        name: "Marcus Wei",
        role: "Backend Engineer @ Meta",
        avatar: "MW",
        avatarClass: "bg-zinc-500 text-white",
        rating: 5,
        quote:
          "I went from zero JavaScript knowledge to building production-grade React apps in 3 months. The hands-on approach and real project feedback make ProTech stand out from every other platform.",
      },
    ],
  },

  // CTA Section Config
  cta: {
    badge: "Get Started",
    title: "Ready to Start Learning?",
    description:
      "Join 50,000+ developers already transforming their careers with ProTech. Start your first course free today.",
    primary: { label: "Get Started Free", to: "/auth/register" },
    secondary: { label: "Browse Courses", to: "/courses" },
    footerText: "No credit card required · Cancel anytime · 30-day money-back guarantee",
  },

  // About Page Config
  about: {
    badge: "✦ Our Story",
    title: "We Build the Engineers of Tomorrow",
    description:
      "ProTech started in 2021 with a simple mission: to bridge the gap between academic computer science theory and practical, real-world software engineering. We teach the skills companies actually hire for.",
    stats: [
      { value: "5+", label: "Years of Excellence" },
      { value: "50K+", label: "Active Alumni" },
      { value: "95%", label: "Employment Rate" },
      { value: "100%", label: "Self-paced Learning" },
    ],
    pillars: {
      title: "Our Core Pillars",
      description:
        "How we approach teaching, learning, and constructing the ultimate software education platform.",
      items: [
        {
          title: "Quality Curriculum",
          description:
            "Every line of code and every video is polished to perfection by experienced developers.",
        },
        {
          title: "Community Driven",
          description:
            "We believe programming is a collaborative journey. Peer review and group work are key components.",
        },
        {
          title: "Real-world Practicality",
          description:
            "No boring slides. You will learn by building real compilers, web frameworks, and system tools.",
        },
        {
          title: "No BS Learning",
          description:
            "Direct to the point. No filler contents. We value your time and prioritize depth of concepts.",
        },
      ],
    },
    team: {
      title: "Meet the Team",
      description:
        "A collective of software builders, creators, and teachers with combined decades of industry experience.",
      items: [
        {
          name: "Alex Rivera",
          role: "Founder & Lead Instructor",
          bio: "Ex-Google Staff Engineer. Loves systems programming and compiler design.",
          initials: "AR",
        },
        {
          name: "Dr. Sarah Chen",
          role: "Head of Content",
          bio: "Ph.D. in Computer Science. Focuses on data science and backend systems.",
          initials: "SC",
        },
        {
          name: "Maya Patel",
          role: "Senior Instructor",
          bio: "Ex-Netflix. Specialized in Frontend Architecture and TypeScript compilers.",
          initials: "MP",
        },
        {
          name: "Jordan Lee",
          role: "Platform Engineer",
          bio: "Builds our interactive code sandbox environments. Lover of Rust and WebAssembly.",
          initials: "JL",
        },
      ],
    },
    cta: {
      title: "Start Writing Professional Code Today",
      description:
        "Invest in your career. Get access to top-tier developer education, code sandboxes, and structured project reviews.",
      buttonLabel: "Explore All Courses",
      buttonTo: "/courses",
    },
  },

  // Footer Config
  footer: {
    description:
      "Master programming languages with expert-led courses. Build real projects. Land your dream job.",
    copyright: "© 2026 ProTech. All rights reserved.",
  },
};
