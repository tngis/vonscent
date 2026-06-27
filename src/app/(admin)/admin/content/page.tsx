import {
  getAllBanners,
  getAllFaqs,
  getAllBlogPosts,
} from "@/features/admin/api";
import { getPopupSettings, getSocialSettings } from "@/features/content/api";
import { ContentManager } from "@/features/admin/components/content-manager";

export default async function AdminContentPage() {
  const [popup, social, banners, faqs, posts] = await Promise.all([
    getPopupSettings(),
    getSocialSettings(),
    getAllBanners(),
    getAllFaqs(),
    getAllBlogPosts(),
  ]);

  return (
    <ContentManager
      popup={popup}
      social={social}
      banners={banners}
      faqs={faqs}
      posts={posts}
    />
  );
}
