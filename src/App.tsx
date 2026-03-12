import { useState, useEffect, useCallback } from 'react';
import { Shuffle, Upload, Instagram, Grid3X3, Sparkles } from 'lucide-react';

interface Post {
  link: string;
  owner: string;
  timestamp: number;
  caption: string;
}

interface Message {
  sender_name: string;
  timestamp_ms: number;
  share?: {
    link: string;
    share_text?: string;
    original_content_owner: string;
  };
}

interface JsonData {
  messages: Message[];
}

function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'random' | 'all'>('random');
  const [randomPosts, setRandomPosts] = useState<Post[]>([]);
  const [shuffledAll, setShuffledAll] = useState<Post[]>([]);

  const parseJsonData = (data: JsonData): Post[] => {
    return data.messages
      .filter((msg) => msg.share?.link)
      .map((msg) => ({
        link: msg.share!.link,
        owner: msg.share!.original_content_owner || 'unknown',
        timestamp: msg.timestamp_ms,
        caption: msg.share!.share_text || '',
      }));
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getRandomTwo = useCallback((allPosts: Post[]): Post[] => {
    if (allPosts.length <= 2) return shuffleArray(allPosts);
    const shuffled = shuffleArray(allPosts);
    return shuffled.slice(0, 2);
  }, []);

  const handleShuffle = () => {
    if (activeTab === 'random') {
      setRandomPosts(getRandomTwo(posts));
    } else {
      setShuffledAll(shuffleArray(posts));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const newPosts = parseJsonData(json);
        setPosts(newPosts);
        setRandomPosts(getRandomTwo(newPosts));
        setShuffledAll(shuffleArray(newPosts));
        localStorage.setItem('antiScrollPosts', JSON.stringify(newPosts));
      } catch (error) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const loadPosts = useCallback((postsData: Post[]) => {
    setPosts(postsData);
    setRandomPosts(getRandomTwo(postsData));
    setShuffledAll(shuffleArray(postsData));
  }, [getRandomTwo]);

  useEffect(() => {
    const loadData = async () => {
      // First check localStorage for user-uploaded data
      const saved = localStorage.getItem('antiScrollPosts');
      if (saved) {
        const savedPosts = JSON.parse(saved);
        loadPosts(savedPosts);
        return;
      }

      // Otherwise, load the bundled default JSON
      try {
        const response = await fetch('/default-posts.json');
        if (response.ok) {
          const json = await response.json();
          const defaultPosts = parseJsonData(json);
          loadPosts(defaultPosts);
          // Save to localStorage so it persists
          localStorage.setItem('antiScrollPosts', JSON.stringify(defaultPosts));
        }
      } catch (error) {
        console.log('No default posts available');
      }
    };

    loadData();
  }, [loadPosts]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString();
  };

  const getEmbedUrl = (link: string): string => {
    // Convert Instagram URL to embed URL with caption
    const url = new URL(link);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Handle both /p/ and /reel/ URLs
    if (pathParts.length >= 2) {
      const type = pathParts[0]; // 'p' or 'reel'
      const id = pathParts[1];
      return `https://www.instagram.com/${type}/${id}/embed/captioned/`;
    }
    return link + 'embed/captioned/';
  };

  const displayPosts = activeTab === 'random' ? randomPosts : shuffledAll;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black border-b border-zinc-800 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Instagram className="w-6 h-6" />
            <span className="font-semibold text-lg">AntiScroll</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer p-2 hover:bg-zinc-800 rounded-full transition">
              <Upload className="w-5 h-5" />
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={handleShuffle}
              className="p-2 hover:bg-zinc-800 rounded-full transition"
            >
              <Shuffle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-16 pb-20">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
            <Instagram className="w-16 h-16 text-zinc-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Posts Yet</h2>
            <p className="text-zinc-500 mb-6">
              Upload your Instagram JSON file to get started
            </p>
            <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload JSON
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            {displayPosts.map((post, index) => (
              <article key={`${post.link}-${index}`} className="bg-black">
                {/* Post Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                    <span className="text-xs font-bold">
                      {post.owner.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{post.owner}</p>
                    <p className="text-xs text-zinc-500">{formatTime(post.timestamp)}</p>
                  </div>
                </div>

                {/* Embedded Post - Full aspect ratio */}
                <div className="w-full">
                  <iframe
                    src={getEmbedUrl(post.link)}
                    className="w-full border-0"
                    style={{
                      minHeight: '680px',
                      maxWidth: '540px',
                      margin: '0 auto',
                      display: 'block',
                      background: '#000'
                    }}
                    allowFullScreen
                    scrolling="no"
                    title={`Post by ${post.owner}`}
                  />
                </div>

                {/* Divider */}
                <div className="border-b border-zinc-800 mt-4" />
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800 z-50 safe-area-bottom">
        <div className="flex h-16">
          <button
            onClick={() => setActiveTab('random')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'random' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            <Sparkles className={`w-6 h-6 ${activeTab === 'random' ? 'fill-white' : ''}`} />
            <span className="text-xs font-medium">Random 2</span>
          </button>

          <button
            onClick={handleShuffle}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-blue-500"
          >
            <div className="w-12 h-12 -mt-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <Shuffle className="w-6 h-6 text-white" />
            </div>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'all' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            <Grid3X3 className={`w-6 h-6 ${activeTab === 'all' ? 'stroke-2' : ''}`} />
            <span className="text-xs font-medium">All ({posts.length})</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
