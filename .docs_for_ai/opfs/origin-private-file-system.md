# Origin private file system

Baseline 2023

Newly available

Since ⁨March 2023⁩, this feature works across the latest devices and
browser versions. This feature might not work in older devices or
browsers.

-   [Learn more](/en-US/docs/Glossary/Baseline/Compatibility)
-   [See full compatibility](#browser_compatibility)
-   [Report
    feedback](https://survey.alchemer.com/s3/7634825/MDN-baseline-feedback?page=%2Fen-US%2Fdocs%2FWeb%2FAPI%2FFile_System_API%2FOrigin_private_file_system&level=low)

::::: section

**Secure context:** This feature is available only in [secure
contexts](/en-US/docs/Web/Security/Secure_Contexts) (HTTPS), in some or
all [supporting browsers](#browser_compatibility).

**Note:** This feature is available in [Web
Workers](/en-US/docs/Web/API/Web_Workers_API).

The **origin private file system** (OPFS) is a storage endpoint provided
as part of the [File System API](/en-US/docs/Web/API/File_System_API),
which is private to the origin of the page and not visible to the user
like the regular file system. It provides access to a special kind of
file that is highly optimized for performance and offers in-place write
access to its content.
:::::

## In this article

-   [Working with files using the File System Access
    API](#working_with_files_using_the_file_system_access_api)
-   [How does the OPFS solve such
    problems?](#how_does_the_opfs_solve_such_problems)
-   [How do you access the OPFS?](#how_do_you_access_the_opfs)
-   [Manipulating the OPFS from the main
    thread](#manipulating_the_opfs_from_the_main_thread)
-   [Manipulating the OPFS from a web
    worker](#manipulating_the_opfs_from_a_web_worker)
-   [Browser compatibility](#browser_compatibility)
-   [See also](#see_also)

::: section
## [Working with files using the File System Access API](#working_with_files_using_the_file_system_access_api)

The [File System Access
API](https://wicg.github.io/file-system-access/), which extends the
[File System API](/en-US/docs/Web/API/File_System_API), provides access
to files using picker methods. For example:

1.  [`Window.showOpenFilePicker()`](/en-US/docs/Web/API/Window/showOpenFilePicker)
    allows the user to choose a file to access, which results in a
    [`FileSystemFileHandle`](/en-US/docs/Web/API/FileSystemFileHandle)
    object being returned.
2.  [`FileSystemFileHandle.getFile()`](/en-US/docs/Web/API/FileSystemFileHandle/getFile)
    is called to get access to the file\'s contents, the content is
    modified using
    [`FileSystemFileHandle.createWritable()`](/en-US/docs/Web/API/FileSystemFileHandle/createWritable)
    /
    [`FileSystemWritableFileStream.write()`](/en-US/docs/Web/API/FileSystemWritableFileStream/write).
3.  [`FileSystemHandle.requestPermission({mode: 'readwrite'})`](/en-US/docs/Web/API/FileSystemHandle/requestPermission)
    is used to request the user\'s permission to save the changes.
4.  If the user accepts the permission request, the changes are saved
    back to the original file.

This works, but it has some restrictions. These changes are being made
to the user-visible file system, so there are a lot of security checks
in place (for example, [safe
browsing](https://developers.google.com/safe-browsing) in Chrome) to
guard against malicious content being written to that file system. These
writes are not in-place, and instead use a temporary file. The original
is not modified unless it passes all the security checks.

As a result, these operations are fairly slow. It is not so noticeable
when you are making small text updates, but the performance suffers when
making more significant, large-scale file updates such as
[SQLite](https://sqlite.org/wasm) database modifications.
:::

::: section
## [How does the OPFS solve such problems?](#how_does_the_opfs_solve_such_problems)

The OPFS offers low-level, byte-by-byte file access, which is private to
the origin of the page and not visible to the user. As a result, it
doesn\'t require the same series of security checks and permission
grants and is therefore faster than File System Access API calls. It
also has a set of synchronous calls available (other File System API
calls are asynchronous) that can be run inside web workers only so as
not to block the main thread.

To summarize how the OPFS differs from the user-visible file system:

-   The OPFS is subject to [browser storage quota
    restrictions](/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria),
    just like any other origin-partitioned storage mechanism (for
    example [IndexedDB API](/en-US/docs/Web/API/IndexedDB_API)). You can
    access the amount of storage space the OPFS is using via
    [`navigator.storage.estimate()`](/en-US/docs/Web/API/StorageManager/estimate).
-   Clearing storage data for the site deletes the OPFS.
-   Permission prompts and security checks are not required to access
    files in the OPFS.
-   Browsers persist the contents of the OPFS to disk somewhere, but you
    cannot expect to find the created files matched one-to-one. The OPFS
    is not intended to be visible to the user.
:::

::: section
## [How do you access the OPFS?](#how_do_you_access_the_opfs)

To access the OPFS in the first place, you call the
[`navigator.storage.getDirectory()`](/en-US/docs/Web/API/StorageManager/getDirectory)
method. This returns a reference to a
[`FileSystemDirectoryHandle`](/en-US/docs/Web/API/FileSystemDirectoryHandle)
object that represents the root of the OPFS.
:::

:::: section
## [Manipulating the OPFS from the main thread](#manipulating_the_opfs_from_the_main_thread)

When accessing the OPFS from the main thread, you will use asynchronous,
[`Promise`](/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)-based
APIs. You can access file
([`FileSystemFileHandle`](/en-US/docs/Web/API/FileSystemFileHandle)) and
directory
([`FileSystemDirectoryHandle`](/en-US/docs/Web/API/FileSystemDirectoryHandle))
handles by calling
[`FileSystemDirectoryHandle.getFileHandle()`](/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle)
and
[`FileSystemDirectoryHandle.getDirectoryHandle()`](/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle)
respectively on the
[`FileSystemDirectoryHandle`](/en-US/docs/Web/API/FileSystemDirectoryHandle)
object representing the OPFS root (and child directories, as they are
created).

**Note:** Passing `{ create: true }` into the above methods causes the
file or folder to be created if it doesn\'t exist.

::::

::: section
### [Reading a file](#reading_a_file)

1.  Make a
    [`FileSystemDirectoryHandle.getFileHandle()`](/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle)
    call to return a
    [`FileSystemFileHandle`](/en-US/docs/Web/API/FileSystemFileHandle)
    object.
2.  Call the
    [`FileSystemFileHandle.getFile()`](/en-US/docs/Web/API/FileSystemFileHandle/getFile)
    object to return a [`File`](/en-US/docs/Web/API/File) object. This
    is a specialized type of [`Blob`](/en-US/docs/Web/API/Blob), and as
    such can be manipulated just like any other `Blob`. For example, you
    could access the text content directly via
    [`Blob.text()`](/en-US/docs/Web/API/Blob/text).
:::

::: section
### [Writing a file](#writing_a_file)

1.  Make a
    [`FileSystemDirectoryHandle.getFileHandle()`](/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle)
    call to return a
    [`FileSystemFileHandle`](/en-US/docs/Web/API/FileSystemFileHandle)
    object.
2.  Call
    [`FileSystemFileHandle.createWritable()`](/en-US/docs/Web/API/FileSystemFileHandle/createWritable)
    to return a
    [`FileSystemWritableFileStream`](/en-US/docs/Web/API/FileSystemWritableFileStream)
    object, which is a specialized type of
    [`WritableStream`](/en-US/docs/Web/API/WritableStream).
3.  Write contents to it using a
    [`FileSystemWritableFileStream.write()`](/en-US/docs/Web/API/FileSystemWritableFileStream/write)
    call.
4.  Close the stream using
    [`WritableStream.close()`](/en-US/docs/Web/API/WritableStream/close).
:::

::: section
### [Deleting a file or folder](#deleting_a_file_or_folder)

You can call
[`FileSystemDirectoryHandle.removeEntry()`](/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry)
on the parent directory, passing it the name of the item you want to
remove:

You can also call
[`FileSystemHandle.remove()`](/en-US/docs/Web/API/FileSystemHandle/remove)
on the
[`FileSystemFileHandle`](/en-US/docs/Web/API/FileSystemFileHandle) or
[`FileSystemDirectoryHandle`](/en-US/docs/Web/API/FileSystemDirectoryHandle)
representing the item you want to remove. To delete a folder including
all subfolders, pass the `{ recursive: true }` option.

The following provides a quick way to clear the entire OPFS:
:::

::: section
### [Listing the contents of a folder](#listing_the_contents_of_a_folder)

[`FileSystemDirectoryHandle`](/en-US/docs/Web/API/FileSystemDirectoryHandle)
is an [asynchronous
iterator](/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols).
As such, you can iterate over it with a
[`for await...of`](/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of)
loop and standard methods such as
[`entries()`](/en-US/docs/Web/API/FileSystemDirectoryHandle/entries),
[`values()`](/en-US/docs/Web/API/FileSystemDirectoryHandle/entries), and
[`keys()`](/en-US/docs/Web/API/FileSystemDirectoryHandle/entries).

For example:
:::

:::: section
## [Manipulating the OPFS from a web worker](#manipulating_the_opfs_from_a_web_worker)

Web Workers don\'t block the main thread, which means you can use the
synchronous file access APIs in this context. Synchronous APIs are
faster as they avoid having to deal with promises.

You can synchronously access a file by calling
[`FileSystemFileHandle.createSyncAccessHandle()`](/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle)
on a regular
[`FileSystemFileHandle`](/en-US/docs/Web/API/FileSystemFileHandle):

**Note:** Despite having \"Sync\" in its name, the
`createSyncAccessHandle()` method itself is asynchronous.

There are a number of *synchronous* methods available on the returned
[`FileSystemSyncAccessHandle`](/en-US/docs/Web/API/FileSystemSyncAccessHandle):

-   [`getSize()`](/en-US/docs/Web/API/FileSystemSyncAccessHandle/getSize):
    Returns the size of the file in bytes.
-   [`write()`](/en-US/docs/Web/API/FileSystemSyncAccessHandle/write):
    Writes the content of a buffer into the file, optionally at a given
    offset, and returns the number of written bytes. Checking the
    returned number of written bytes allows callers to detect and handle
    errors and partial writes.
-   [`read()`](/en-US/docs/Web/API/FileSystemSyncAccessHandle/read):
    Reads the contents of the file into a buffer, optionally at a given
    offset.
-   [`truncate()`](/en-US/docs/Web/API/FileSystemSyncAccessHandle/truncate):
    Resizes the file to the given size.
-   [`flush()`](/en-US/docs/Web/API/FileSystemSyncAccessHandle/flush):
    Ensures that the file contents contain all the modifications done
    through `write()`.
-   [`close()`](/en-US/docs/Web/API/FileSystemSyncAccessHandle/close):
    Closes the access handle.

Here is an example that uses all the methods mentioned above:
::::

::: section
## [Browser compatibility](#browser_compatibility)
:::

::: section
## [See also](#see_also)

-   [The origin private file
    system](https://web.dev/articles/origin-private-file-system) on
    web.dev
:::

:::::: section

## Help improve MDN

[Learn how to
contribute](https://github.com/mdn/content/blob/main/CONTRIBUTING.md)

This page was last modified on ⁨Jul 14, 2025⁩ by [MDN
contributors](/en-US/docs/Web/API/File_System_API/Origin_private_file_system/contributors.txt).

[View this page on
GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/file_system_api/origin_private_file_system/index.md?plain=1)
• [Report a problem with this
content](https://github.com/mdn/content/issues/new?template=page-report.yml&mdn-url=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FFile_System_API%2FOrigin_private_file_system&metadata=%3C%21--+Do+not+make+changes+below+this+line+--%3E%0A%3Cdetails%3E%0A%3Csummary%3EPage+report+details%3C%2Fsummary%3E%0A%0A*+Folder%3A+%60en-us%2Fweb%2Fapi%2Ffile_system_api%2Forigin_private_file_system%60%0A*+MDN+URL%3A+https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FFile_System_API%2FOrigin_private_file_system%0A*+GitHub+URL%3A+https%3A%2F%2Fgithub.com%2Fmdn%2Fcontent%2Fblob%2Fmain%2Ffiles%2Fen-us%2Fweb%2Fapi%2Ffile_system_api%2Forigin_private_file_system%2Findex.md%0A*+Last+commit%3A+https%3A%2F%2Fgithub.com%2Fmdn%2Fcontent%2Fcommit%2F0d0ccc861fa024fa10836fbf0cc2c3813cd74745%0A*+Document+last+modified%3A+2025-07-14T15%3A01%3A33.000Z%0A%0A%3C%2Fdetails%3E)

::::::
