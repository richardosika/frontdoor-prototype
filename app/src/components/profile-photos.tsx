import { serverTx } from "@/lib/i18n/server";
import { PHOTO_HINTS } from "@/lib/photo-hints";
import { btnOutline } from "@/components/ui";
import { ImageCropUpload } from "@/components/image-crop-upload";
import { moveGalleryImage, removeMemberImage, saveGalleryCaption, uploadMemberImage } from "@/actions/images";
import { GALLERY_MAX, IMAGE_ACCEPT, IMAGE_TARGET } from "@/lib/member-images";


/** A tiny profile mockup with the spot this upload fills highlighted in brass. */
function PlacementHint({ kind, text, label }: { kind: "avatar" | "cover" | "gallery"; text: string; label: string }) {
  const on = "bg-brass";
  const off = "bg-line";
  return (
    <div className="mb-3 flex items-start gap-3" data-testid={`photo-hint-${kind}`}>
      <div aria-hidden className="w-[92px] shrink-0 overflow-hidden rounded border border-line bg-paper" title={label}>
        <div className={`h-6 ${kind === "cover" ? on : off}`} />
        <div className="-mt-3 flex items-end gap-1 px-1.5">
          <span className={`block h-6 w-6 rounded-full border-2 border-paper ${kind === "avatar" ? on : "bg-mut/40"}`} />
          <span className="mb-0.5 block h-1.5 w-10 rounded bg-forest/60" />
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-0.5 px-1.5 pb-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`block h-3 rounded-[2px] ${kind === "gallery" ? on : off}`} />
          ))}
        </div>
      </div>
      <p className="min-w-0 text-[14px] leading-snug text-ink">
        <span className="sr-only">{label}: </span>
        {text}
      </p>
    </div>
  );
}

type GalleryImage = { id: string; caption: string; width: number; height: number };

const heading = "mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[0.16em] text-brass";
const small = `${btnOutline} min-h-10 px-3 py-1.5 text-[13px]`;

/** Profile photo, cover image and the Photos gallery. Owners edit; every member who can open the profile sees the gallery. */
export async function ProfilePhotos({
  isSelf,
  photoId,
  coverId,
  gallery,
}: {
  isSelf: boolean;
  photoId: string;
  coverId: string;
  gallery: GalleryImage[];
}) {
  const tx = await serverTx();
  if (!isSelf && gallery.length === 0) return null;
  const labels = {
    choose: tx("Choose an image"),
    zoom: tx("Zoom"),
    drag: tx("Drag the image to position it."),
    noPreview: tx("Preview is not available for this file in your browser. It will be centered and cropped when saved."),
    saving: tx("Saving. HEIC photos can take a minute to convert."),
  };
  return (
    <section id="photos" className="scroll-mt-20" data-testid="profile-photos">
      {isSelf ? (
        <>
          <h2 className={heading}>{tx("Profile photo and cover")}</h2>
          <p className="mb-3 text-[14px] text-mut">{tx("JPG, PNG, HEIC, WebP, or GIF up to 5 MB. Images are resized on our servers.")}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded border border-line bg-cream p-4">
              <h3 className="mb-2 font-serif text-lg text-forest">{tx("Profile photo")}</h3>
              <PlacementHint kind="avatar" text={tx(PHOTO_HINTS.avatar)} label={tx("Where it shows")} />
              <ImageCropUpload action={uploadMemberImage} kind="AVATAR" aspect={1} accept={IMAGE_ACCEPT} labels={{ ...labels, save: tx("Save profile photo") }} />
              {photoId ? (
                <form action={removeMemberImage} className="mt-2">
                  <input type="hidden" name="imageId" value={photoId} />
                  <button className={small} type="submit">{tx("Remove photo")}</button>
                </form>
              ) : null}
            </div>
            <div className="min-w-0 rounded border border-line bg-cream p-4">
              <h3 className="mb-2 font-serif text-lg text-forest">{tx("Cover image or company logo")}</h3>
              <PlacementHint kind="cover" text={tx(PHOTO_HINTS.cover)} label={tx("Where it shows")} />
              <ImageCropUpload action={uploadMemberImage} kind="COVER" aspect={IMAGE_TARGET.COVER.aspect} accept={IMAGE_ACCEPT} labels={{ ...labels, save: tx("Save cover image") }} />
              {coverId ? (
                <form action={removeMemberImage} className="mt-2">
                  <input type="hidden" name="imageId" value={coverId} />
                  <button className={small} type="submit">{tx("Remove cover image")}</button>
                </form>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
      <h2 className={heading}>{tx("Photos")}</h2>
      {gallery.length === 0 ? <p className="text-[14px] text-mut">{tx("Add photos of your projects, team, or work. Other members can see them.")}</p> : null}
      {gallery.length ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="gallery">
          {gallery.map((image, index) => (
            <li key={image.id} className="min-w-0 overflow-hidden rounded border border-line bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/member-images/${image.id}`} alt={image.caption} width={image.width} height={image.height} loading="lazy" className="block h-auto w-full bg-cream" />
              {isSelf ? (
                <div className="grid gap-2 p-3">
                  <form action={saveGalleryCaption} className="flex gap-2">
                    <input type="hidden" name="imageId" value={image.id} />
                    <input name="caption" defaultValue={image.caption} maxLength={200} placeholder={tx("Caption (optional)")} className="min-h-10 min-w-0 flex-1 rounded-sm border border-line bg-paper px-3 text-[16px]" />
                    <button className={small} type="submit">{tx("Save")}</button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {index > 0 ? (
                      <form action={moveGalleryImage}>
                        <input type="hidden" name="imageId" value={image.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button className={small} type="submit" aria-label={tx("Move earlier")}>↑ {tx("Earlier")}</button>
                      </form>
                    ) : null}
                    {index < gallery.length - 1 ? (
                      <form action={moveGalleryImage}>
                        <input type="hidden" name="imageId" value={image.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button className={small} type="submit" aria-label={tx("Move later")}>↓ {tx("Later")}</button>
                      </form>
                    ) : null}
                    <form action={removeMemberImage}>
                      <input type="hidden" name="imageId" value={image.id} />
                      <button className={small} type="submit">{tx("Delete")}</button>
                    </form>
                  </div>
                </div>
              ) : image.caption ? (
                <p className="p-3 text-[14px] text-ink">{image.caption}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {isSelf && gallery.length < GALLERY_MAX ? (
        <div className="mt-4 rounded border border-line bg-cream p-4">
          <h3 className="mb-2 font-serif text-lg text-forest">{tx("Add a photo")}</h3>
          <PlacementHint kind="gallery" text={tx(PHOTO_HINTS.gallery)} label={tx("Where it shows")} />
          <ImageCropUpload
            action={uploadMemberImage}
            kind="GALLERY"
            aspect={null}
            accept={IMAGE_ACCEPT}
            labels={{ ...labels, save: tx("Add photo"), caption: tx("Caption (optional)") }}
          />
        </div>
      ) : null}
    </section>
  );
}
