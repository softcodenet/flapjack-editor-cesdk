import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { GetServerSidePropsContext } from "next";
import { ITemplateDetails } from "../../interfaces";
import Editor from "../../components/Editor/Editor";
import { getUser } from "../../hooks";
import PrivatePage from "../../components/PrivatePage/PrivatePage";

const Menu = ({ data }: { data: ITemplateDetails; images: string[] }) => {
  const user = getUser();
  if (
    (!user && !data?.isGlobal) ||
    user?.restaurant_id !== data?.restaurant_id && user?.role !== "flapjack"
  ) {
    return <PrivatePage login={!user} />;
  }
  return (
    <>
      <Editor template={data} />
    </>
  );
};
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createServerSupabaseClient(context);
  const { data } = await supabase
    .from("templates")
    .select(
      "id, createdBy, name, description, content, tags, isGlobal, menuSize"
    )
    .eq("id", context?.params?.id);

  const { data: images, error } = await supabase.storage
    .from("renderings")
    .list(`${context?.params?.id}`, {
      limit: 6,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
  let imageUrls: string[] = [];
  if (images?.length) {
    images.forEach(async (image, i) => {
      const {
        data: { publicUrl: imageUrl },
      } = await supabase.storage
        .from("renderings")
        .getPublicUrl(`${context?.params?.id}/${image.name}`);
      imageUrls.push(imageUrl);
    });
  }
  return {
    props: { data: data ? data[0] : null, images: imageUrls }, // will be passed to the page component as props
  };
}

export default Menu;
