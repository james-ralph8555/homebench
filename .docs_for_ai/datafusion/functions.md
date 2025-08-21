# Special Functions

## Expansion Functions

-   [unnest](#unnest)
-   [unnest(struct)](#unnest-struct)

### `unnest`

Expands an array or map into rows.

#### Arguments

-   **array**: Array expression to unnest. Can be a constant, column, or
    function, and any combination of array operators.

### `unnest`` ``(struct)`

Expand a struct fields into individual columns. Each field of the struct
will be prefixed with `__unnest_placeholder` and could be accessed via
`"__unnest_placeholder(<struct>).<field>"`.

#### Arguments

-   **struct**: Object expression to unnest. Can be a constant, column,
    or function, and any combination of object operators.

# Scalar Functions

## Math Functions

-   [abs](#abs)
-   [acos](#acos)
-   [acosh](#acosh)
-   [asin](#asin)
-   [asinh](#asinh)
-   [atan](#atan)
-   [atan2](#atan2)
-   [atanh](#atanh)
-   [cbrt](#cbrt)
-   [ceil](#ceil)
-   [cos](#cos)
-   [cosh](#cosh)
-   [cot](#cot)
-   [degrees](#degrees)
-   [exp](#exp)
-   [factorial](#factorial)
-   [floor](#floor)
-   [gcd](#gcd)
-   [isnan](#isnan)
-   [iszero](#iszero)
-   [lcm](#lcm)
-   [ln](#ln)
-   [log](#log)
-   [log10](#log10)
-   [log2](#log2)
-   [nanvl](#nanvl)
-   [pi](#pi)
-   [pow](#pow)
-   [power](#power)
-   [radians](#radians)
-   [random](#random)
-   [round](#round)
-   [signum](#signum)
-   [sin](#sin)
-   [sinh](#sinh)
-   [sqrt](#sqrt)
-   [tan](#tan)
-   [tanh](#tanh)
-   [trunc](#trunc)

### `abs`

Returns the absolute value of a number.

    abs(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `acos`

Returns the arc cosine or inverse cosine of a number.

    acos(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `acosh`

Returns the area hyperbolic cosine or inverse hyperbolic cosine of a
number.

    acosh(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `asin`

Returns the arc sine or inverse sine of a number.

    asin(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `asinh`

Returns the area hyperbolic sine or inverse hyperbolic sine of a number.

    asinh(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `atan`

Returns the arc tangent or inverse tangent of a number.

    atan(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `atan2`

Returns the arc tangent or inverse tangent of
`expression_y`` ``/`` ``expression_x`.

    atan2(expression_y, expression_x)

#### Arguments

-   **expression_y**: First numeric expression to operate on. Can be a
    constant, column, or function, and any combination of arithmetic
    operators.

-   **expression_x**: Second numeric expression to operate on. Can be a
    constant, column, or function, and any combination of arithmetic
    operators.

### `atanh`

Returns the area hyperbolic tangent or inverse hyperbolic tangent of a
number.

    atanh(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `cbrt`

Returns the cube root of a number.

    cbrt(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `ceil`

Returns the nearest integer greater than or equal to a number.

    ceil(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `cos`

Returns the cosine of a number.

    cos(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `cosh`

Returns the hyperbolic cosine of a number.

    cosh(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `cot`

Returns the cotangent of a number.

    cot(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `degrees`

Converts radians to degrees.

    degrees(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `exp`

Returns the base-e exponential of a number.

    exp(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `factorial`

Factorial. Returns 1 if value is less than 2.

    factorial(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `floor`

Returns the nearest integer less than or equal to a number.

    floor(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `gcd`

Returns the greatest common divisor of `expression_x` and
`expression_y`. Returns 0 if both inputs are zero.

    gcd(expression_x, expression_y)

#### Arguments

-   **expression_x**: First numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

-   **expression_y**: Second numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `isnan`

Returns true if a given number is +NaN or -NaN otherwise returns false.

    isnan(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `iszero`

Returns true if a given number is +0.0 or -0.0 otherwise returns false.

    iszero(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `lcm`

Returns the least common multiple of `expression_x` and `expression_y`.
Returns 0 if either input is zero.

    lcm(expression_x, expression_y)

#### Arguments

-   **expression_x**: First numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

-   **expression_y**: Second numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `ln`

Returns the natural logarithm of a number.

    ln(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `log`

Returns the base-x logarithm of a number. Can either provide a specified
base, or if omitted then takes the base-10 of a number.

    log(base, numeric_expression)
    log(numeric_expression)

#### Arguments

-   **base**: Base numeric expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `log10`

Returns the base-10 logarithm of a number.

    log10(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `log2`

Returns the base-2 logarithm of a number.

    log2(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `nanvl`

Returns the first argument if it's not *NaN*. Returns the second
argument otherwise.

    nanvl(expression_x, expression_y)

#### Arguments

-   **expression_x**: Numeric expression to return if it's not *NaN*.
    Can be a constant, column, or function, and any combination of
    arithmetic operators.

-   **expression_y**: Numeric expression to return if the first
    expression is *NaN*. Can be a constant, column, or function, and any
    combination of arithmetic operators.

### `pi`

Returns an approximate value of π.

    pi()

### `pow`

*Alias of [power](#power).*

### `power`

Returns a base expression raised to the power of an exponent.

    power(base, exponent)

#### Arguments

-   **base**: Numeric expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **exponent**: Exponent numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

#### Aliases

-   pow

### `radians`

Converts degrees to radians.

    radians(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `random`

Returns a random float value in the range [0, 1). The random seed is
unique to each row.

    random()

### `round`

Rounds a number to the nearest integer.

    round(numeric_expression[, decimal_places])

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

-   **decimal_places**: Optional. The number of decimal places to round
    to. Defaults to 0.

### `signum`

Returns the sign of a number. Negative numbers return `-1`. Zero and
positive numbers return `1`.

    signum(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `sin`

Returns the sine of a number.

    sin(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `sinh`

Returns the hyperbolic sine of a number.

    sinh(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `sqrt`

Returns the square root of a number.

    sqrt(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `tan`

Returns the tangent of a number.

    tan(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `tanh`

Returns the hyperbolic tangent of a number.

    tanh(numeric_expression)

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

### `trunc`

Truncates a number to a whole number or truncated to the specified
decimal places.

    trunc(numeric_expression[, decimal_places])

#### Arguments

-   **numeric_expression**: Numeric expression to operate on. Can be a
    constant, column, or function, and any combination of operators.

-   **decimal_places**: Optional. The number of decimal places to
    truncate to. Defaults to 0 (truncate to a whole number). If
    `decimal_places` is a positive integer, truncates digits to the
    right of the decimal point. If `decimal_places` is a negative
    integer, replaces digits to the left of the decimal point with `0`.

## Conditional Functions

-   [coalesce](#coalesce)
-   [greatest](#greatest)
-   [ifnull](#ifnull)
-   [least](#least)
-   [nullif](#nullif)
-   [nvl](#nvl)
-   [nvl2](#nvl2)

### `coalesce`

Returns the first of its arguments that is not *null*. Returns *null* if
all arguments are *null*. This function is often used to substitute a
default value for *null* values.

    coalesce(expression1[, ..., expression_n])

#### Arguments

-   **expression1, expression_n**: Expression to use if previous
    expressions are *null*. Can be a constant, column, or function, and
    any combination of arithmetic operators. Pass as many expression
    arguments as necessary.

### `greatest`

Returns the greatest value in a list of expressions. Returns *null* if
all expressions are *null*.

    greatest(expression1[, ..., expression_n])

#### Arguments

-   **expression1, expression_n**: Expressions to compare and return the
    greatest value.. Can be a constant, column, or function, and any
    combination of arithmetic operators. Pass as many expression
    arguments as necessary.

### `ifnull`

*Alias of [nvl](#nvl).*

### `least`

Returns the smallest value in a list of expressions. Returns *null* if
all expressions are *null*.

    least(expression1[, ..., expression_n])

#### Arguments

-   **expression1, expression_n**: Expressions to compare and return the
    smallest value. Can be a constant, column, or function, and any
    combination of arithmetic operators. Pass as many expression
    arguments as necessary.

### `nullif`

Returns *null* if *expression1* equals *expression2*; otherwise it
returns *expression1*. This can be used to perform the inverse operation
of [`coalesce`](#coalesce).

    nullif(expression1, expression2)

#### Arguments

-   **expression1**: Expression to compare and return if equal to
    expression2. Can be a constant, column, or function, and any
    combination of operators.

-   **expression2**: Expression to compare to expression1. Can be a
    constant, column, or function, and any combination of operators.

### `nvl`

Returns *expression2* if *expression1* is NULL otherwise it returns
*expression1*.

    nvl(expression1, expression2)

#### Arguments

-   **expression1**: Expression to return if not null. Can be a
    constant, column, or function, and any combination of operators.

-   **expression2**: Expression to return if expr1 is null. Can be a
    constant, column, or function, and any combination of operators.

#### Aliases

-   ifnull

### `nvl2`

Returns *expression2* if *expression1* is not NULL; otherwise it returns
*expression3*.

    nvl2(expression1, expression2, expression3)

#### Arguments

-   **expression1**: Expression to test for null. Can be a constant,
    column, or function, and any combination of operators.

-   **expression2**: Expression to return if expr1 is not null. Can be a
    constant, column, or function, and any combination of operators.

-   **expression3**: Expression to return if expr1 is null. Can be a
    constant, column, or function, and any combination of operators.

## String Functions

-   [ascii](#ascii)
-   [bit_length](#bit-length)
-   [btrim](#btrim)
-   [char_length](#char-length)
-   [character_length](#character-length)
-   [chr](#chr)
-   [concat](#concat)
-   [concat_ws](#concat-ws)
-   [contains](#contains)
-   [ends_with](#ends-with)
-   [find_in_set](#find-in-set)
-   [initcap](#initcap)
-   [instr](#instr)
-   [left](#left)
-   [length](#length)
-   [levenshtein](#levenshtein)
-   [lower](#lower)
-   [lpad](#lpad)
-   [ltrim](#ltrim)
-   [octet_length](#octet-length)
-   [overlay](#overlay)
-   [position](#position)
-   [repeat](#repeat)
-   [replace](#replace)
-   [reverse](#reverse)
-   [right](#right)
-   [rpad](#rpad)
-   [rtrim](#rtrim)
-   [split_part](#split-part)
-   [starts_with](#starts-with)
-   [strpos](#strpos)
-   [substr](#substr)
-   [substr_index](#substr-index)
-   [substring](#substring)
-   [substring_index](#substring-index)
-   [to_hex](#to-hex)
-   [translate](#translate)
-   [trim](#trim)
-   [upper](#upper)
-   [uuid](#uuid)

### `ascii`

Returns the first Unicode scalar value of a string.

    ascii(str)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

**Related functions**:

-   [chr](#chr)

### `bit_length`

Returns the bit length of a string.

    bit_length(str)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

**Related functions**:

-   [length](#length)
-   [octet_length](#octet-length)

### `btrim`

Trims the specified trim string from the start and end of a string. If
no trim string is provided, all whitespace is removed from the start and
end of the input string.

    btrim(str[, trim_str])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **trim_str**: String expression to operate on. Can be a constant,
    column, or function, and any combination of operators. *Default is
    whitespace characters.*

#### Alternative Syntax

    trim(BOTH trim_str FROM str)

    trim(trim_str FROM str)

#### Aliases

-   trim

**Related functions**:

-   [ltrim](#ltrim)
-   [rtrim](#rtrim)

### `char_length`

*Alias of [character_length](#character-length).*

### `character_length`

Returns the number of characters in a string.

    character_length(str)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

#### Aliases

-   length
-   char_length

**Related functions**:

-   [bit_length](#bit-length)
-   [octet_length](#octet-length)

### `chr`

Returns a string containing the character with the specified Unicode
scalar value.

    chr(expression)

#### Arguments

-   **expression**: String expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

**Related functions**:

-   [ascii](#ascii)

### `concat`

Concatenates multiple strings together.

    concat(str[, ..., str_n])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **str_n**: Subsequent string expressions to concatenate.

**Related functions**:

-   [concat_ws](#concat-ws)

### `concat_ws`

Concatenates multiple strings together with a specified separator.

    concat_ws(separator, str[, ..., str_n])

#### Arguments

-   **separator**: Separator to insert between concatenated strings.

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **str_n**: Subsequent string expressions to concatenate.

**Related functions**:

-   [concat](#concat)

### `contains`

Return true if search_str is found within string (case-sensitive).

    contains(str, search_str)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **search_str**: The string to search for in str.

### `ends_with`

Tests if a string ends with a substring.

    ends_with(str, substr)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **substr**: Substring to test for.

### `find_in_set`

Returns a value in the range of 1 to N if the string str is in the
string list strlist consisting of N substrings.

    find_in_set(str, strlist)

#### Arguments

-   **str**: String expression to find in strlist.

-   **strlist**: A string list is a string composed of substrings
    separated by , characters.

### `initcap`

Capitalizes the first character in each word in the input string. Words
are delimited by non-alphanumeric characters.

    initcap(str)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

**Related functions**:

-   [lower](#lower)
-   [upper](#upper)

### `instr`

*Alias of [strpos](#strpos).*

### `left`

Returns a specified number of characters from the left side of a string.

    left(str, n)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **n**: Number of characters to return.

**Related functions**:

-   [right](#right)

### `length`

*Alias of [character_length](#character-length).*

### `levenshtein`

Returns the
[`Levenshtein`` ``distance`](https://en.wikipedia.org/wiki/Levenshtein_distance)
between the two given strings.

    levenshtein(str1, str2)

#### Arguments

-   **str1**: String expression to compute Levenshtein distance with
    str2.

-   **str2**: String expression to compute Levenshtein distance with
    str1.

### `lower`

Converts a string to lower-case.

    lower(str)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

**Related functions**:

-   [initcap](#initcap)
-   [upper](#upper)

### `lpad`

Pads the left side of a string with another string to a specified string
length.

    lpad(str, n[, padding_str])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **n**: String length to pad to.

-   **padding_str**: Optional string expression to pad with. Can be a
    constant, column, or function, and any combination of string
    operators. *Default is a space.*

**Related functions**:

-   [rpad](#rpad)

### `ltrim`

Trims the specified trim string from the beginning of a string. If no
trim string is provided, all whitespace is removed from the start of the
input string.

    ltrim(str[, trim_str])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **trim_str**: String expression to trim from the beginning of the
    input string. Can be a constant, column, or function, and any
    combination of arithmetic operators. *Default is whitespace
    characters.*

#### Alternative Syntax

    trim(LEADING trim_str FROM str)

**Related functions**:

-   [btrim](#btrim)
-   [rtrim](#rtrim)

### `octet_length`

Returns the length of a string in bytes.

    octet_length(str)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

**Related functions**:

-   [bit_length](#bit-length)
-   [length](#length)

### `overlay`

Returns the string which is replaced by another string from the
specified position and specified count length.

    overlay(str PLACING substr FROM pos [FOR count])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **substr**: Substring to replace in str.

-   **pos**: The start position to start the replace in str.

-   **count**: The count of characters to be replaced from start
    position of str. If not specified, will use substr length instead.

### `position`

*Alias of [strpos](#strpos).*

### `repeat`

Returns a string with an input string repeated a specified number.

    repeat(str, n)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **n**: Number of times to repeat the input string.

### `replace`

Replaces all occurrences of a specified substring in a string with a new
substring.

    replace(str, substr, replacement)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **substr**: Substring expression to replace in the input string.
    Substring expression to operate on. Can be a constant, column, or
    function, and any combination of operators.

-   **replacement**: Replacement substring expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `reverse`

Reverses the character order of a string.

    reverse(str)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

### `right`

Returns a specified number of characters from the right side of a
string.

    right(str, n)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **n**: Number of characters to return.

**Related functions**:

-   [left](#left)

### `rpad`

Pads the right side of a string with another string to a specified
string length.

    rpad(str, n[, padding_str])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **n**: String length to pad to.

-   **padding_str**: String expression to pad with. Can be a constant,
    column, or function, and any combination of string operators.
    *Default is a space.*

**Related functions**:

-   [lpad](#lpad)

### `rtrim`

Trims the specified trim string from the end of a string. If no trim
string is provided, all whitespace is removed from the end of the input
string.

    rtrim(str[, trim_str])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **trim_str**: String expression to trim from the end of the input
    string. Can be a constant, column, or function, and any combination
    of arithmetic operators. *Default is whitespace characters.*

#### Alternative Syntax

    trim(TRAILING trim_str FROM str)

**Related functions**:

-   [btrim](#btrim)
-   [ltrim](#ltrim)

### `split_part`

Splits a string based on a specified delimiter and returns the substring
in the specified position.

    split_part(str, delimiter, pos)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **delimiter**: String or character to split on.

-   **pos**: Position of the part to return.

### `starts_with`

Tests if a string starts with a substring.

    starts_with(str, substr)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **substr**: Substring to test for.

### `strpos`

Returns the starting position of a specified substring in a string.
Positions begin at 1. If the substring does not exist in the string, the
function returns 0.

    strpos(str, substr)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **substr**: Substring expression to search for.

#### Alternative Syntax

    position(substr in origstr)

#### Aliases

-   instr
-   position

### `substr`

Extracts a substring of a specified number of characters from a specific
starting position in a string.

    substr(str, start_pos[, length])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **start_pos**: Character position to start the substring at. The
    first character in the string has a position of 1.

-   **length**: Number of characters to extract. If not specified,
    returns the rest of the string after the start position.

#### Alternative Syntax

    substring(str from start_pos for length)

#### Aliases

-   substring

### `substr_index`

Returns the substring from str before count occurrences of the delimiter
delim. If count is positive, everything to the left of the final
delimiter (counting from the left) is returned. If count is negative,
everything to the right of the final delimiter (counting from the right)
is returned.

    substr_index(str, delim, count)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **delim**: The string to find in str to split str.

-   **count**: The number of times to search for the delimiter. Can be
    either a positive or negative number.

#### Aliases

-   substring_index

### `substring`

*Alias of [substr](#substr).*

### `substring_index`

*Alias of [substr_index](#substr-index).*

### `to_hex`

Converts an integer to a hexadecimal string.

    to_hex(int)

#### Arguments

-   **int**: Integer expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `translate`

Translates characters in a string to specified translation characters.

    translate(str, chars, translation)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **chars**: Characters to translate.

-   **translation**: Translation characters. Translation characters
    replace only characters at the same position in the **chars**
    string.

### `trim`

*Alias of [btrim](#btrim).*

### `upper`

Converts a string to upper-case.

    upper(str)

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

**Related functions**:

-   [initcap](#initcap)
-   [lower](#lower)

### `uuid`

Returns
[`UUID`` ``v4`](https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_(random))
string value which is unique per row.

    uuid()

## Binary String Functions

-   [decode](#decode)
-   [encode](#encode)

### `decode`

Decode binary data from textual representation in string.

    decode(expression, format)

#### Arguments

-   **expression**: Expression containing encoded string data
-   **format**: Same arguments as [encode](#encode)

**Related functions**:

-   [encode](#encode)

### `encode`

Encode binary data into a textual representation.

    encode(expression, format)

#### Arguments

-   **expression**: Expression containing string or binary data
-   **format**: Supported formats are: `base64`, `hex`

**Related functions**:

-   [decode](#decode)

## Regular Expression Functions

Apache DataFusion uses a
[PCRE-like](https://en.wikibooks.org/wiki/Regular_Expressions/Perl-Compatible_Regular_Expressions)
regular expression [syntax](https://docs.rs/regex/latest/regex/#syntax)
(minus support for several features including look-around and
backreferences). The following regular expression functions are
supported:

-   [regexp_count](#regexp-count)
-   [regexp_instr](#regexp-instr)
-   [regexp_like](#regexp-like)
-   [regexp_match](#regexp-match)
-   [regexp_replace](#regexp-replace)

### `regexp_count`

Returns the number of matches that a [regular
expression](https://docs.rs/regex/latest/regex/#syntax) has in a string.

    regexp_count(str, regexp[, start, flags])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **regexp**: Regular expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **start**: - **start**: Optional start position (the first position
    is 1) to search for the regular expression. Can be a constant,
    column, or function.

-   **flags**: Optional regular expression flags that control the
    behavior of the regular expression. The following flags are
    supported:

    -   **i**: case-insensitive: letters match both upper and lower case

    -   **m**: multi-line mode: \^ and \$ match begin/end of line

    -   **s**: allow . to match \\n

    -   **R**: enables CRLF mode: when multi-line mode is enabled,
        \\r\\n is used

    -   **U**: swap the meaning of x\* and x\*?

### `regexp_instr`

Returns the position in a string where the specified occurrence of a
POSIX regular expression is located.

    regexp_instr(str, regexp[, start[, N[, flags[, subexpr]]]])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **regexp**: Regular expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **start**: - **start**: Optional start position (the first position
    is 1) to search for the regular expression. Can be a constant,
    column, or function. Defaults to 1

-   **N**: - **N**: Optional The N-th occurrence of pattern to find.
    Defaults to 1 (first match). Can be a constant, column, or function.

-   **flags**: Optional regular expression flags that control the
    behavior of the regular expression. The following flags are
    supported:

    -   **i**: case-insensitive: letters match both upper and lower case

    -   **m**: multi-line mode: \^ and \$ match begin/end of line

    -   **s**: allow . to match \\n

    -   **R**: enables CRLF mode: when multi-line mode is enabled,
        \\r\\n is used

    -   **U**: swap the meaning of x\* and x\*?

-   **subexpr**: Optional Specifies which capture group (subexpression)
    to return the position for. Defaults to 0, which returns the
    position of the entire match.

### `regexp_like`

Returns true if a [regular
expression](https://docs.rs/regex/latest/regex/#syntax) has at least one
match in a string, false otherwise.

    regexp_like(str, regexp[, flags])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **regexp**: Regular expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **flags**: Optional regular expression flags that control the
    behavior of the regular expression. The following flags are
    supported:

    -   **i**: case-insensitive: letters match both upper and lower case

    -   **m**: multi-line mode: \^ and \$ match begin/end of line

    -   **s**: allow . to match \\n

    -   **R**: enables CRLF mode: when multi-line mode is enabled,
        \\r\\n is used

    -   **U**: swap the meaning of x\* and x\*?

Additional examples can be found
[here](https://github.com/apache/datafusion/blob/main/datafusion-examples/examples/regexp.rs)

### `regexp_match`

Returns the first [regular
expression](https://docs.rs/regex/latest/regex/#syntax) matches in a
string.

    regexp_match(str, regexp[, flags])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **regexp**: Regular expression to match against. Can be a constant,
    column, or function.

-   **flags**: Optional regular expression flags that control the
    behavior of the regular expression. The following flags are
    supported:

    -   **i**: case-insensitive: letters match both upper and lower case

    -   **m**: multi-line mode: \^ and \$ match begin/end of line

    -   **s**: allow . to match \\n

    -   **R**: enables CRLF mode: when multi-line mode is enabled,
        \\r\\n is used

    -   **U**: swap the meaning of x\* and x\*?

Additional examples can be found
[here](https://github.com/apache/datafusion/blob/main/datafusion-examples/examples/regexp.rs)

### `regexp_replace`

Replaces substrings in a string that match a [regular
expression](https://docs.rs/regex/latest/regex/#syntax).

    regexp_replace(str, regexp, replacement[, flags])

#### Arguments

-   **str**: String expression to operate on. Can be a constant, column,
    or function, and any combination of operators.

-   **regexp**: Regular expression to match against. Can be a constant,
    column, or function.

-   **replacement**: Replacement string expression to operate on. Can be
    a constant, column, or function, and any combination of operators.

-   **flags**: Optional regular expression flags that control the
    behavior of the regular expression. The following flags are
    supported:

-   **g**: (global) Search globally and don't return after the first
    match

-   **i**: case-insensitive: letters match both upper and lower case

-   **m**: multi-line mode: \^ and \$ match begin/end of line

-   **s**: allow . to match \\n

-   **R**: enables CRLF mode: when multi-line mode is enabled, \\r\\n is
    used

-   **U**: swap the meaning of x\* and x\*?

Additional examples can be found
[here](https://github.com/apache/datafusion/blob/main/datafusion-examples/examples/regexp.rs)

## Time and Date Functions

-   [current_date](#current-date)
-   [current_time](#current-time)
-   [current_timestamp](#current-timestamp)
-   [date_bin](#date-bin)
-   [date_format](#date-format)
-   [date_part](#date-part)
-   [date_trunc](#date-trunc)
-   [datepart](#datepart)
-   [datetrunc](#datetrunc)
-   [from_unixtime](#from-unixtime)
-   [make_date](#make-date)
-   [now](#now)
-   [to_char](#to-char)
-   [to_date](#to-date)
-   [to_local_time](#to-local-time)
-   [to_timestamp](#to-timestamp)
-   [to_timestamp_micros](#to-timestamp-micros)
-   [to_timestamp_millis](#to-timestamp-millis)
-   [to_timestamp_nanos](#to-timestamp-nanos)
-   [to_timestamp_seconds](#to-timestamp-seconds)
-   [to_unixtime](#to-unixtime)
-   [today](#today)

### `current_date`

Returns the current UTC date.

The `current_date()` return value is determined at query time and will
return the same date, no matter when in the query plan the function
executes.

    current_date()

#### Aliases

-   today

### `current_time`

Returns the current UTC time.

The `current_time()` return value is determined at query time and will
return the same time, no matter when in the query plan the function
executes.

    current_time()

### `current_timestamp`

*Alias of [now](#now).*

### `date_bin`

Calculates time intervals and returns the start of the interval nearest
to the specified timestamp. Use `date_bin` to downsample time series
data by grouping rows into time-based "bins" or "windows" and applying
an aggregate or selector function to each window.

For example, if you "bin" or "window" data into 15 minute intervals, an
input timestamp of `2023-01-01T18:18:18Z` will be updated to the start
time of the 15 minute bin it is in: `2023-01-01T18:15:00Z`.

    date_bin(interval, expression, origin-timestamp)

#### Arguments

-   **interval**: Bin interval.

-   **expression**: Time expression to operate on. Can be a constant,
    column, or function.

-   **origin-timestamp**: Optional. Starting point used to determine bin
    boundaries. If not specified defaults 1970-01-01T00:00:00Z (the UNIX
    epoch in UTC). The following intervals are supported:

    -   nanoseconds
    -   microseconds
    -   milliseconds
    -   seconds
    -   minutes
    -   hours
    -   days
    -   weeks
    -   months
    -   years
    -   century

### `date_format`

*Alias of [to_char](#to-char).*

### `date_part`

Returns the specified part of the date as an integer.

    date_part(part, expression)

#### Arguments

-   **part**: Part of the date to return. The following date parts are
    supported:

    -   year
    -   quarter (emits value in inclusive range [1, 4] based on which
        quartile of the year the date is in)
    -   month
    -   week (week of the year)
    -   day (day of the month)
    -   hour
    -   minute
    -   second
    -   millisecond
    -   microsecond
    -   nanosecond
    -   dow (day of the week where Sunday is 0)
    -   doy (day of the year)
    -   epoch (seconds since Unix epoch)
    -   isodow (day of the week where Monday is 0)

-   **expression**: Time expression to operate on. Can be a constant,
    column, or function.

#### Alternative Syntax

    extract(field FROM source)

#### Aliases

-   datepart

### `date_trunc`

Truncates a timestamp value to a specified precision.

    date_trunc(precision, expression)

#### Arguments

-   **precision**: Time precision to truncate to. The following
    precisions are supported:

    -   year / YEAR
    -   quarter / QUARTER
    -   month / MONTH
    -   week / WEEK
    -   day / DAY
    -   hour / HOUR
    -   minute / MINUTE
    -   second / SECOND
    -   millisecond / MILLISECOND
    -   microsecond / MICROSECOND

-   **expression**: Time expression to operate on. Can be a constant,
    column, or function.

#### Aliases

-   datetrunc

### `datepart`

*Alias of [date_part](#date-part).*

### `datetrunc`

*Alias of [date_trunc](#date-trunc).*

### `from_unixtime`

Converts an integer to RFC3339 timestamp format
(`YYYY-MM-DDT00:00:00.000000000Z`). Integers and unsigned integers are
interpreted as seconds since the unix epoch (`1970-01-01T00:00:00Z`)
return the corresponding timestamp.

    from_unixtime(expression[, timezone])

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **timezone**: Optional timezone to use when converting the integer
    to a timestamp. If not provided, the default timezone is UTC.

### `make_date`

Make a date from year/month/day component parts.

    make_date(year, month, day)

#### Arguments

-   **year**: Year to use when making the date. Can be a constant,
    column or function, and any combination of arithmetic operators.

-   **month**: Month to use when making the date. Can be a constant,
    column or function, and any combination of arithmetic operators.

-   **day**: Day to use when making the date. Can be a constant, column
    or function, and any combination of arithmetic operators.

### `now`

Returns the current UTC timestamp.

The `now()` return value is determined at query time and will return the
same timestamp, no matter when in the query plan the function executes.

    now()

#### Aliases

-   current_timestamp

### `to_char`

Returns a string representation of a date, time, timestamp or duration
based on a [Chrono
format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html).
Unlike the PostgreSQL equivalent of this function numerical formatting
is not supported.

    to_char(expression, format)

#### Arguments

-   **expression**: Expression to operate on. Can be a constant, column,
    or function that results in a date, time, timestamp or duration.

-   **format**: A [Chrono
    format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
    string to use to convert the expression.

-   **day**: Day to use when making the date. Can be a constant, column
    or function, and any combination of arithmetic operators.

#### Aliases

-   date_format

### `to_date`

Converts a value to a date (`YYYY-MM-DD`). Supports strings, integer and
double types as input. Strings are parsed as YYYY-MM-DD (e.g.
'2023-07-20') if no [Chrono
format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)s
are provided. Integers and doubles are interpreted as days since the
unix epoch (`1970-01-01T00:00:00Z`). Returns the corresponding date.

Note: `to_date` returns Date32, which represents its values as the
number of days since unix epoch(`1970-01-01`) stored as signed 32 bit
value. The largest supported date value is `9999-12-31`.

    to_date('2017-05-31', '%Y-%m-%d')

#### Arguments

-   **expression**: String expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **format_n**: Optional [Chrono
    format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
    strings to use to parse the expression. Formats will be tried in the
    order they appear with the first successful one being returned. If
    none of the formats successfully parse the expression an error will
    be returned.

### `to_local_time`

Converts a timestamp with a timezone to a timestamp without a timezone
(with no offset or timezone information). This function handles daylight
saving time changes.

    to_local_time(expression)

#### Arguments

-   **expression**: Time expression to operate on. Can be a constant,
    column, or function.

### `to_timestamp`

Converts a value to a timestamp (`YYYY-MM-DDT00:00:00Z`). Supports
strings, integer, unsigned integer, and double types as input. Strings
are parsed as RFC3339 (e.g. '2023-07-20T05:44:00') if no [Chrono
formats] are provided. Integers, unsigned integers, and doubles are
interpreted as seconds since the unix epoch (`1970-01-01T00:00:00Z`).
Returns the corresponding timestamp.

Note: `to_timestamp` returns `Timestamp(Nanosecond)`. The supported
range for integer input is between `-9223372037` and `9223372036`.
Supported range for string input is between `1677-09-21T00:12:44.0` and
`2262-04-11T23:47:16.0`. Please use `to_timestamp_seconds` for the input
outside of supported bounds.

    to_timestamp(expression[, ..., format_n])

#### Arguments

-   **expression**: Expression to operate on. Can be a constant, column,
    or function, and any combination of arithmetic operators.

-   **format_n**: Optional [Chrono
    format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
    strings to use to parse the expression. Formats will be tried in the
    order they appear with the first successful one being returned. If
    none of the formats successfully parse the expression an error will
    be returned.

### `to_timestamp_micros`

Converts a value to a timestamp (`YYYY-MM-DDT00:00:00.000000Z`).
Supports strings, integer, and unsigned integer types as input. Strings
are parsed as RFC3339 (e.g. '2023-07-20T05:44:00') if no [Chrono
format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)s
are provided. Integers and unsigned integers are interpreted as
microseconds since the unix epoch (`1970-01-01T00:00:00Z`) Returns the
corresponding timestamp.

    to_timestamp_micros(expression[, ..., format_n])

#### Arguments

-   **expression**: Expression to operate on. Can be a constant, column,
    or function, and any combination of arithmetic operators.

-   **format_n**: Optional [Chrono
    format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
    strings to use to parse the expression. Formats will be tried in the
    order they appear with the first successful one being returned. If
    none of the formats successfully parse the expression an error will
    be returned.

### `to_timestamp_millis`

Converts a value to a timestamp (`YYYY-MM-DDT00:00:00.000Z`). Supports
strings, integer, and unsigned integer types as input. Strings are
parsed as RFC3339 (e.g. '2023-07-20T05:44:00') if no [Chrono
formats](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
are provided. Integers and unsigned integers are interpreted as
milliseconds since the unix epoch (`1970-01-01T00:00:00Z`). Returns the
corresponding timestamp.

    to_timestamp_millis(expression[, ..., format_n])

#### Arguments

-   **expression**: Expression to operate on. Can be a constant, column,
    or function, and any combination of arithmetic operators.

-   **format_n**: Optional [Chrono
    format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
    strings to use to parse the expression. Formats will be tried in the
    order they appear with the first successful one being returned. If
    none of the formats successfully parse the expression an error will
    be returned.

### `to_timestamp_nanos`

Converts a value to a timestamp (`YYYY-MM-DDT00:00:00.000000000Z`).
Supports strings, integer, and unsigned integer types as input. Strings
are parsed as RFC3339 (e.g. '2023-07-20T05:44:00') if no [Chrono
format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)s
are provided. Integers and unsigned integers are interpreted as
nanoseconds since the unix epoch (`1970-01-01T00:00:00Z`). Returns the
corresponding timestamp.

    to_timestamp_nanos(expression[, ..., format_n])

#### Arguments

-   **expression**: Expression to operate on. Can be a constant, column,
    or function, and any combination of arithmetic operators.

-   **format_n**: Optional [Chrono
    format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
    strings to use to parse the expression. Formats will be tried in the
    order they appear with the first successful one being returned. If
    none of the formats successfully parse the expression an error will
    be returned.

### `to_timestamp_seconds`

Converts a value to a timestamp (`YYYY-MM-DDT00:00:00.000Z`). Supports
strings, integer, and unsigned integer types as input. Strings are
parsed as RFC3339 (e.g. '2023-07-20T05:44:00') if no [Chrono
format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)s
are provided. Integers and unsigned integers are interpreted as seconds
since the unix epoch (`1970-01-01T00:00:00Z`). Returns the corresponding
timestamp.

    to_timestamp_seconds(expression[, ..., format_n])

#### Arguments

-   **expression**: Expression to operate on. Can be a constant, column,
    or function, and any combination of arithmetic operators.

-   **format_n**: Optional [Chrono
    format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
    strings to use to parse the expression. Formats will be tried in the
    order they appear with the first successful one being returned. If
    none of the formats successfully parse the expression an error will
    be returned.

### `to_unixtime`

Converts a value to seconds since the unix epoch
(`1970-01-01T00:00:00Z`). Supports strings, dates, timestamps and double
types as input. Strings are parsed as RFC3339 (e.g.
'2023-07-20T05:44:00') if no [Chrono
formats](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
are provided.

    to_unixtime(expression[, ..., format_n])

#### Arguments

-   **expression**: Expression to operate on. Can be a constant, column,
    or function, and any combination of arithmetic operators.

-   **format_n**: Optional [Chrono
    format](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)
    strings to use to parse the expression. Formats will be tried in the
    order they appear with the first successful one being returned. If
    none of the formats successfully parse the expression an error will
    be returned.

### `today`

*Alias of [current_date](#current-date).*

## Array Functions

-   [array_any_value](#array-any-value)
-   [array_append](#array-append)
-   [array_cat](#array-cat)
-   [array_concat](#array-concat)
-   [array_contains](#array-contains)
-   [array_dims](#array-dims)
-   [array_distance](#array-distance)
-   [array_distinct](#array-distinct)
-   [array_element](#array-element)
-   [array_empty](#array-empty)
-   [array_except](#array-except)
-   [array_extract](#array-extract)
-   [array_has](#array-has)
-   [array_has_all](#array-has-all)
-   [array_has_any](#array-has-any)
-   [array_indexof](#array-indexof)
-   [array_intersect](#array-intersect)
-   [array_join](#array-join)
-   [array_length](#array-length)
-   [array_max](#array-max)
-   [array_min](#array-min)
-   [array_ndims](#array-ndims)
-   [array_pop_back](#array-pop-back)
-   [array_pop_front](#array-pop-front)
-   [array_position](#array-position)
-   [array_positions](#array-positions)
-   [array_prepend](#array-prepend)
-   [array_push_back](#array-push-back)
-   [array_push_front](#array-push-front)
-   [array_remove](#array-remove)
-   [array_remove_all](#array-remove-all)
-   [array_remove_n](#array-remove-n)
-   [array_repeat](#array-repeat)
-   [array_replace](#array-replace)
-   [array_replace_all](#array-replace-all)
-   [array_replace_n](#array-replace-n)
-   [array_resize](#array-resize)
-   [array_reverse](#array-reverse)
-   [array_slice](#array-slice)
-   [array_sort](#array-sort)
-   [array_to_string](#array-to-string)
-   [array_union](#array-union)
-   [arrays_overlap](#arrays-overlap)
-   [cardinality](#cardinality)
-   [empty](#empty)
-   [flatten](#flatten)
-   [generate_series](#generate-series)
-   [list_any_value](#list-any-value)
-   [list_append](#list-append)
-   [list_cat](#list-cat)
-   [list_concat](#list-concat)
-   [list_contains](#list-contains)
-   [list_dims](#list-dims)
-   [list_distance](#list-distance)
-   [list_distinct](#list-distinct)
-   [list_element](#list-element)
-   [list_empty](#list-empty)
-   [list_except](#list-except)
-   [list_extract](#list-extract)
-   [list_has](#list-has)
-   [list_has_all](#list-has-all)
-   [list_has_any](#list-has-any)
-   [list_indexof](#list-indexof)
-   [list_intersect](#list-intersect)
-   [list_join](#list-join)
-   [list_length](#list-length)
-   [list_max](#list-max)
-   [list_ndims](#list-ndims)
-   [list_pop_back](#list-pop-back)
-   [list_pop_front](#list-pop-front)
-   [list_position](#list-position)
-   [list_positions](#list-positions)
-   [list_prepend](#list-prepend)
-   [list_push_back](#list-push-back)
-   [list_push_front](#list-push-front)
-   [list_remove](#list-remove)
-   [list_remove_all](#list-remove-all)
-   [list_remove_n](#list-remove-n)
-   [list_repeat](#list-repeat)
-   [list_replace](#list-replace)
-   [list_replace_all](#list-replace-all)
-   [list_replace_n](#list-replace-n)
-   [list_resize](#list-resize)
-   [list_reverse](#list-reverse)
-   [list_slice](#list-slice)
-   [list_sort](#list-sort)
-   [list_to_string](#list-to-string)
-   [list_union](#list-union)
-   [make_array](#make-array)
-   [make_list](#make-list)
-   [range](#range)
-   [string_to_array](#string-to-array)
-   [string_to_list](#string-to-list)

### `array_any_value`

Returns the first non-null element in the array.

    array_any_value(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

#### Aliases

-   list_any_value

### `array_append`

Appends an element to the end of an array.

    array_append(array, element)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **element**: Element to append to the array.

#### Aliases

-   list_append
-   array_push_back
-   list_push_back

### `array_cat`

*Alias of [array_concat](#array-concat).*

### `array_concat`

Concatenates arrays.

    array_concat(array[, ..., array_n])

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **array_n**: Subsequent array column or literal array to
    concatenate.

#### Aliases

-   array_cat
-   list_concat
-   list_cat

### `array_contains`

*Alias of [array_has](#array-has).*

### `array_dims`

Returns an array of the array's dimensions.

    array_dims(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

#### Aliases

-   list_dims

### `array_distance`

Returns the Euclidean distance between two input arrays of equal length.

    array_distance(array1, array2)

#### Arguments

-   **array1**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

-   **array2**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

#### Aliases

-   list_distance

### `array_distinct`

Returns distinct values from the array after removing duplicates.

    array_distinct(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

#### Aliases

-   list_distinct

### `array_element`

Extracts the element with the index n from the array.

    array_element(array, index)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **index**: Index to extract the element from the array.

#### Aliases

-   array_extract
-   list_element
-   list_extract

### `array_empty`

*Alias of [empty](#empty).*

### `array_except`

Returns an array of the elements that appear in the first array but not
in the second.

    array_except(array1, array2)

#### Arguments

-   **array1**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

-   **array2**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

#### Aliases

-   list_except

### `array_extract`

*Alias of [array_element](#array-element).*

### `array_has`

Returns true if the array contains the element.

    array_has(array, element)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **element**: Scalar or Array expression. Can be a constant, column,
    or function, and any combination of array operators.

#### Aliases

-   list_has
-   array_contains
-   list_contains

### `array_has_all`

Returns true if all elements of sub-array exist in array.

    array_has_all(array, sub-array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **sub-array**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

#### Aliases

-   list_has_all

### `array_has_any`

Returns true if any elements exist in both arrays.

    array_has_any(array, sub-array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **sub-array**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

#### Aliases

-   list_has_any
-   arrays_overlap

### `array_indexof`

*Alias of [array_position](#array-position).*

### `array_intersect`

Returns an array of elements in the intersection of array1 and array2.

    array_intersect(array1, array2)

#### Arguments

-   **array1**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

-   **array2**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

#### Aliases

-   list_intersect

### `array_join`

*Alias of [array_to_string](#array-to-string).*

### `array_length`

Returns the length of the array dimension.

    array_length(array, dimension)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **dimension**: Array dimension.

#### Aliases

-   list_length

### `array_max`

Returns the maximum value in the array.

    array_max(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

#### Aliases

-   list_max

### `array_min`

Returns the minimum value in the array.

    array_min(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

### `array_ndims`

Returns the number of dimensions of the array.

    array_ndims(array, element)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **element**: Array element.

#### Aliases

-   list_ndims

### `array_pop_back`

Returns the array without the last element.

    array_pop_back(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

#### Aliases

-   list_pop_back

### `array_pop_front`

Returns the array without the first element.

    array_pop_front(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

#### Aliases

-   list_pop_front

### `array_position`

Returns the position of the first occurrence of the specified element in
the array, or NULL if not found.

    array_position(array, element)
    array_position(array, element, index)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **element**: Element to search for position in the array.

-   **index**: Index at which to start searching (1-indexed).

#### Aliases

-   list_position
-   array_indexof
-   list_indexof

### `array_positions`

Searches for an element in the array, returns all occurrences.

    array_positions(array, element)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **element**: Element to search for position in the array.

#### Aliases

-   list_positions

### `array_prepend`

Prepends an element to the beginning of an array.

    array_prepend(element, array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **element**: Element to prepend to the array.

#### Aliases

-   list_prepend
-   array_push_front
-   list_push_front

### `array_push_back`

*Alias of [array_append](#array-append).*

### `array_push_front`

*Alias of [array_prepend](#array-prepend).*

### `array_remove`

Removes the first element from the array equal to the given value.

    array_remove(array, element)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **element**: Element to be removed from the array.

#### Aliases

-   list_remove

### `array_remove_all`

Removes all elements from the array equal to the given value.

    array_remove_all(array, element)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **element**: Element to be removed from the array.

#### Aliases

-   list_remove_all

### `array_remove_n`

Removes the first `max` elements from the array equal to the given
value.

    array_remove_n(array, element, max))

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **element**: Element to be removed from the array.

-   **max**: Number of first occurrences to remove.

#### Aliases

-   list_remove_n

### `array_repeat`

Returns an array containing element `count` times.

    array_repeat(element, count)

#### Arguments

-   **element**: Element expression. Can be a constant, column, or
    function, and any combination of array operators.

-   **count**: Value of how many times to repeat the element.

#### Aliases

-   list_repeat

### `array_replace`

Replaces the first occurrence of the specified element with another
specified element.

    array_replace(array, from, to)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **from**: Initial element.

-   **to**: Final element.

#### Aliases

-   list_replace

### `array_replace_all`

Replaces all occurrences of the specified element with another specified
element.

    array_replace_all(array, from, to)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **from**: Initial element.

-   **to**: Final element.

#### Aliases

-   list_replace_all

### `array_replace_n`

Replaces the first `max` occurrences of the specified element with
another specified element.

    array_replace_n(array, from, to, max)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **from**: Initial element.

-   **to**: Final element.

-   **max**: Number of first occurrences to replace.

#### Aliases

-   list_replace_n

### `array_resize`

Resizes the list to contain size elements. Initializes new elements with
value or empty if value is not set.

    array_resize(array, size, value)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **size**: New size of given array.

-   **value**: Defines new elements' value or empty if value is not set.

#### Aliases

-   list_resize

### `array_reverse`

Returns the array with the order of the elements reversed.

    array_reverse(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

#### Aliases

-   list_reverse

### `array_slice`

Returns a slice of the array based on 1-indexed start and end positions.

    array_slice(array, begin, end)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **begin**: Index of the first element. If negative, it counts
    backward from the end of the array.

-   **end**: Index of the last element. If negative, it counts backward
    from the end of the array.

-   **stride**: Stride of the array slice. The default is 1.

#### Aliases

-   list_slice

### `array_sort`

Sort array.

    array_sort(array, desc, nulls_first)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **desc**: Whether to sort in descending order(`ASC` or `DESC`).

-   **nulls_first**: Whether to sort nulls first(`NULLS`` ``FIRST` or
    `NULLS`` ``LAST`).

#### Aliases

-   list_sort

### `array_to_string`

Converts each element to its text representation.

    array_to_string(array, delimiter[, null_string])

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

-   **delimiter**: Array element separator.

-   **null_string**: Optional. String to replace null values in the
    array. If not provided, nulls will be handled by default behavior.

#### Aliases

-   list_to_string
-   array_join
-   list_join

### `array_union`

Returns an array of elements that are present in both arrays (all
elements from both arrays) with out duplicates.

    array_union(array1, array2)

#### Arguments

-   **array1**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

-   **array2**: Array expression. Can be a constant, column, or
    function, and any combination of array operators.

#### Aliases

-   list_union

### `arrays_overlap`

*Alias of [array_has_any](#array-has-any).*

### `cardinality`

Returns the total number of elements in the array.

    cardinality(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

### `empty`

Returns 1 for an empty array or 0 for a non-empty array.

    empty(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

#### Aliases

-   array_empty
-   list_empty

### `flatten`

Converts an array of arrays to a flat array.

-   Applies to any depth of nested arrays
-   Does not change arrays that are already flat

The flattened array contains all the elements from all source arrays.

    flatten(array)

#### Arguments

-   **array**: Array expression. Can be a constant, column, or function,
    and any combination of array operators.

### `generate_series`

Similar to the range function, but it includes the upper bound.

    generate_series(start, stop, step)

#### Arguments

-   **start**: Start of the series. Ints, timestamps, dates or string
    types that can be coerced to Date32 are supported.

-   **end**: End of the series (included). Type must be the same as
    start.

-   **step**: Increase by step (can not be 0). Steps less than a day are
    supported only for timestamp ranges.

### `list_any_value`

*Alias of [array_any_value](#array-any-value).*

### `list_append`

*Alias of [array_append](#array-append).*

### `list_cat`

*Alias of [array_concat](#array-concat).*

### `list_concat`

*Alias of [array_concat](#array-concat).*

### `list_contains`

*Alias of [array_has](#array-has).*

### `list_dims`

*Alias of [array_dims](#array-dims).*

### `list_distance`

*Alias of [array_distance](#array-distance).*

### `list_distinct`

*Alias of [array_distinct](#array-distinct).*

### `list_element`

*Alias of [array_element](#array-element).*

### `list_empty`

*Alias of [empty](#empty).*

### `list_except`

*Alias of [array_except](#array-except).*

### `list_extract`

*Alias of [array_element](#array-element).*

### `list_has`

*Alias of [array_has](#array-has).*

### `list_has_all`

*Alias of [array_has_all](#array-has-all).*

### `list_has_any`

*Alias of [array_has_any](#array-has-any).*

### `list_indexof`

*Alias of [array_position](#array-position).*

### `list_intersect`

*Alias of [array_intersect](#array-intersect).*

### `list_join`

*Alias of [array_to_string](#array-to-string).*

### `list_length`

*Alias of [array_length](#array-length).*

### `list_max`

*Alias of [array_max](#array-max).*

### `list_ndims`

*Alias of [array_ndims](#array-ndims).*

### `list_pop_back`

*Alias of [array_pop_back](#array-pop-back).*

### `list_pop_front`

*Alias of [array_pop_front](#array-pop-front).*

### `list_position`

*Alias of [array_position](#array-position).*

### `list_positions`

*Alias of [array_positions](#array-positions).*

### `list_prepend`

*Alias of [array_prepend](#array-prepend).*

### `list_push_back`

*Alias of [array_append](#array-append).*

### `list_push_front`

*Alias of [array_prepend](#array-prepend).*

### `list_remove`

*Alias of [array_remove](#array-remove).*

### `list_remove_all`

*Alias of [array_remove_all](#array-remove-all).*

### `list_remove_n`

*Alias of [array_remove_n](#array-remove-n).*

### `list_repeat`

*Alias of [array_repeat](#array-repeat).*

### `list_replace`

*Alias of [array_replace](#array-replace).*

### `list_replace_all`

*Alias of [array_replace_all](#array-replace-all).*

### `list_replace_n`

*Alias of [array_replace_n](#array-replace-n).*

### `list_resize`

*Alias of [array_resize](#array-resize).*

### `list_reverse`

*Alias of [array_reverse](#array-reverse).*

### `list_slice`

*Alias of [array_slice](#array-slice).*

### `list_sort`

*Alias of [array_sort](#array-sort).*

### `list_to_string`

*Alias of [array_to_string](#array-to-string).*

### `list_union`

*Alias of [array_union](#array-union).*

### `make_array`

Returns an array using the specified input expressions.

    make_array(expression1[, ..., expression_n])

#### Arguments

-   **expression_n**: Expression to include in the output array. Can be
    a constant, column, or function, and any combination of arithmetic
    or string operators.

#### Aliases

-   make_list

### `make_list`

*Alias of [make_array](#make-array).*

### `range`

Returns an Arrow array between start and stop with step. The range
start..end contains all values with start <= x < end. It is empty if
start >= end. Step cannot be 0.

    range(start, stop, step)

#### Arguments

-   **start**: Start of the range. Ints, timestamps, dates or string
    types that can be coerced to Date32 are supported.

-   **end**: End of the range (not included). Type must be the same as
    start.

-   **step**: Increase by step (cannot be 0). Steps less than a day are
    supported only for timestamp ranges.

### `string_to_array`

Splits a string into an array of substrings based on a delimiter. Any
substrings matching the optional `null_str` argument are replaced with
NULL.

    string_to_array(str, delimiter[, null_str])

#### Arguments

-   **str**: String expression to split.

-   **delimiter**: Delimiter string to split on.

-   **null_str**: Substring values to be replaced with `NULL`.

#### Aliases

-   string_to_list

### `string_to_list`

*Alias of [string_to_array](#string-to-array).*

## Struct Functions

-   [named_struct](#named-struct)
-   [row](#row)
-   [struct](#struct)

### `named_struct`

Returns an Arrow struct using the specified name and input expressions
pairs.

    named_struct(expression1_name, expression1_input[, ..., expression_n_name, expression_n_input])

#### Arguments

-   **expression_n_name**: Name of the column field. Must be a constant
    string.

-   **expression_n_input**: Expression to include in the output struct.
    Can be a constant, column, or function, and any combination of
    arithmetic or string operators.

### `row`

*Alias of [struct](#struct).*

### `struct`

Returns an Arrow struct using the specified input expressions optionally
named. Fields in the returned struct use the optional name or the `cN`
naming convention. For example: `c0`, `c1`, `c2`, etc.

    struct(expression1[, ..., expression_n])

#### Arguments

-   **expression1, expression_n**: Expression to include in the output
    struct. Can be a constant, column, or function, any combination of
    arithmetic or string operators.

#### Aliases

-   row

## Map Functions

-   [element_at](#element-at)
-   [map](#map)
-   [map_entries](#map-entries)
-   [map_extract](#map-extract)
-   [map_keys](#map-keys)
-   [map_values](#map-values)

### `element_at`

*Alias of [map_extract](#map-extract).*

### `map`

Returns an Arrow map with the specified key-value pairs.

The `make_map` function creates a map from two lists: one for keys and
one for values. Each key must be unique and non-null.

    map(key, value)
    map(key: value)
    make_map(['key1', 'key2'], ['value1', 'value2'])

#### Arguments

-   **key**: For `map`: Expression to be used for key. Can be a
    constant, column, function, or any combination of arithmetic or
    string operators. For `make_map`: The list of keys to be used in the
    map. Each key must be unique and non-null.

-   **value**: For `map`: Expression to be used for value. Can be a
    constant, column, function, or any combination of arithmetic or
    string operators. For `make_map`: The list of values to be mapped to
    the corresponding keys.

### `map_entries`

Returns a list of all entries in the map.

    map_entries(map)

#### Arguments

-   **map**: Map expression. Can be a constant, column, or function, and
    any combination of map operators.

### `map_extract`

Returns a list containing the value for the given key or an empty list
if the key is not present in the map.

    map_extract(map, key)

#### Arguments

-   **map**: Map expression. Can be a constant, column, or function, and
    any combination of map operators.

-   **key**: Key to extract from the map. Can be a constant, column, or
    function, any combination of arithmetic or string operators, or a
    named expression of the previously listed.

#### Aliases

-   element_at

### `map_keys`

Returns a list of all keys in the map.

    map_keys(map)

#### Arguments

-   **map**: Map expression. Can be a constant, column, or function, and
    any combination of map operators.

### `map_values`

Returns a list of all values in the map.

    map_values(map)

#### Arguments

-   **map**: Map expression. Can be a constant, column, or function, and
    any combination of map operators.

## Hashing Functions

-   [digest](#digest)
-   [md5](#md5)
-   [sha224](#sha224)
-   [sha256](#sha256)
-   [sha384](#sha384)
-   [sha512](#sha512)

### `digest`

Computes the binary hash of an expression using the specified algorithm.

    digest(expression, algorithm)

#### Arguments

-   **expression**: String expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **algorithm**: String expression specifying algorithm to use. Must
    be one of:

    -   md5
    -   sha224
    -   sha256
    -   sha384
    -   sha512
    -   blake2s
    -   blake2b
    -   blake3

### `md5`

Computes an MD5 128-bit checksum for a string expression.

    md5(expression)

#### Arguments

-   **expression**: String expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `sha224`

Computes the SHA-224 hash of a binary string.

    sha224(expression)

#### Arguments

-   **expression**: String expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `sha256`

Computes the SHA-256 hash of a binary string.

    sha256(expression)

#### Arguments

-   **expression**: String expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `sha384`

Computes the SHA-384 hash of a binary string.

    sha384(expression)

#### Arguments

-   **expression**: String expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `sha512`

Computes the SHA-512 hash of a binary string.

    sha512(expression)

#### Arguments

-   **expression**: String expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

## Union Functions

Functions to work with the union data type, also know as tagged unions,
variant types, enums or sum types. Note: Not related to the SQL UNION
operator

-   [union_extract](#union-extract)
-   [union_tag](#union-tag)

### `union_extract`

Returns the value of the given field in the union when selected, or NULL
otherwise.

    union_extract(union, field_name)

#### Arguments

-   **union**: Union expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **field_name**: String expression to operate on. Must be a constant.

### `union_tag`

Returns the name of the currently selected field in the union

    union_tag(union_expression)

#### Arguments

-   **union**: Union expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

## Other Functions

-   [arrow_cast](#arrow-cast)
-   [arrow_typeof](#arrow-typeof)
-   [get_field](#get-field)
-   [version](#version)

### `arrow_cast`

Casts a value to a specific Arrow data type.

    arrow_cast(expression, datatype)

#### Arguments

-   **expression**: Expression to cast. The expression can be a
    constant, column, or function, and any combination of operators.

-   **datatype**: [Arrow data
    type](https://docs.rs/arrow/latest/arrow/datatypes/enum.DataType.html)
    name to cast to, as a string. The format is the same as that
    returned by [`arrow_typeof`]

### `arrow_typeof`

Returns the name of the underlying [Arrow data
type](https://docs.rs/arrow/latest/arrow/datatypes/enum.DataType.html)
of the expression.

    arrow_typeof(expression)

#### Arguments

-   **expression**: Expression to evaluate. The expression can be a
    constant, column, or function, and any combination of operators.

### `get_field`

Returns a field within a map or a struct with the given key. Note: most
users invoke `get_field` indirectly via field access syntax such as
`my_struct_col['field_name']` which results in a call to
`get_field(my_struct_col,`` ``'field_name')`.

    get_field(expression1, expression2)

#### Arguments

-   **expression1**: The map or struct to retrieve a field for.

-   **expression2**: The field name in the map or struct to retrieve
    data for. Must evaluate to a string.

### `version`

Returns the version of DataFusion.

    version()

# Aggregate Functions

Aggregate functions operate on a set of values to compute a single
result.

## General Functions

-   [array_agg](#array-agg)
-   [avg](#avg)
-   [bit_and](#bit-and)
-   [bit_or](#bit-or)
-   [bit_xor](#bit-xor)
-   [bool_and](#bool-and)
-   [bool_or](#bool-or)
-   [count](#count)
-   [first_value](#first-value)
-   [grouping](#grouping)
-   [last_value](#last-value)
-   [max](#max)
-   [mean](#mean)
-   [median](#median)
-   [min](#min)
-   [string_agg](#string-agg)
-   [sum](#sum)
-   [var](#var)
-   [var_pop](#var-pop)
-   [var_population](#var-population)
-   [var_samp](#var-samp)
-   [var_sample](#var-sample)

### `array_agg`

Returns an array created from the expression elements. If ordering is
required, elements are inserted in the specified order. This aggregation
function can only mix DISTINCT and ORDER BY if the ordering expression
is exactly the same as the argument expression.

    array_agg(expression [ORDER BY expression])

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `avg`

Returns the average of numeric values in the specified column.

    avg(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

#### Aliases

-   mean

### `bit_and`

Computes the bitwise AND of all non-null input values.

    bit_and(expression)

#### Arguments

-   **expression**: Integer expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `bit_or`

Computes the bitwise OR of all non-null input values.

    bit_or(expression)

#### Arguments

-   **expression**: Integer expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `bit_xor`

Computes the bitwise exclusive OR of all non-null input values.

    bit_xor(expression)

#### Arguments

-   **expression**: Integer expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `bool_and`

Returns true if all non-null input values are true, otherwise false.

    bool_and(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `bool_or`

Returns true if all non-null input values are true, otherwise false.

    bool_and(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `count`

Returns the number of non-null values in the specified column. To
include null values in the total count, use `count(*)`.

    count(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `first_value`

Returns the first element in an aggregation group according to the
requested ordering. If no ordering is given, returns an arbitrary
element from the group.

    first_value(expression [ORDER BY expression])

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `grouping`

Returns 1 if the data is aggregated across the specified column, or 0 if
it is not aggregated in the result set.

    grouping(expression)

#### Arguments

-   **expression**: Expression to evaluate whether data is aggregated
    across the specified column. Can be a constant, column, or function.

### `last_value`

Returns the last element in an aggregation group according to the
requested ordering. If no ordering is given, returns an arbitrary
element from the group.

    last_value(expression [ORDER BY expression])

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `max`

Returns the maximum value in the specified column.

    max(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `mean`

*Alias of [avg](#avg).*

### `median`

Returns the median value in the specified column.

    median(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `min`

Returns the minimum value in the specified column.

    min(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `string_agg`

Concatenates the values of string expressions and places separator
values between them. If ordering is required, strings are concatenated
in the specified order. This aggregation function can only mix DISTINCT
and ORDER BY if the ordering expression is exactly the same as the first
argument expression.

    string_agg([DISTINCT] expression, delimiter [ORDER BY expression])

#### Arguments

-   **expression**: The string expression to concatenate. Can be a
    column or any valid string expression.

-   **delimiter**: A literal string used as a separator between the
    concatenated values.

### `sum`

Returns the sum of all values in the specified column.

    sum(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `var`

Returns the statistical sample variance of a set of numbers.

    var(expression)

#### Arguments

-   **expression**: Numeric expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

#### Aliases

-   var_sample
-   var_samp

### `var_pop`

Returns the statistical population variance of a set of numbers.

    var_pop(expression)

#### Arguments

-   **expression**: Numeric expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

#### Aliases

-   var_population

### `var_population`

*Alias of [var_pop](#var-pop).*

### `var_samp`

*Alias of [var](#var).*

### `var_sample`

*Alias of [var](#var).*

## Statistical Functions

-   [corr](#corr)
-   [covar](#covar)
-   [covar_pop](#covar-pop)
-   [covar_samp](#covar-samp)
-   [nth_value](#nth-value)
-   [regr_avgx](#regr-avgx)
-   [regr_avgy](#regr-avgy)
-   [regr_count](#regr-count)
-   [regr_intercept](#regr-intercept)
-   [regr_r2](#regr-r2)
-   [regr_slope](#regr-slope)
-   [regr_sxx](#regr-sxx)
-   [regr_sxy](#regr-sxy)
-   [regr_syy](#regr-syy)
-   [stddev](#stddev)
-   [stddev_pop](#stddev-pop)
-   [stddev_samp](#stddev-samp)

### `corr`

Returns the coefficient of correlation between two numeric values.

    corr(expression1, expression2)

#### Arguments

-   **expression1**: First expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **expression2**: Second expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `covar`

*Alias of [covar_samp](#covar-samp).*

### `covar_pop`

Returns the sample covariance of a set of number pairs.

    covar_samp(expression1, expression2)

#### Arguments

-   **expression1**: First expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **expression2**: Second expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `covar_samp`

Returns the sample covariance of a set of number pairs.

    covar_samp(expression1, expression2)

#### Arguments

-   **expression1**: First expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **expression2**: Second expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

#### Aliases

-   covar

### `nth_value`

Returns the nth value in a group of values.

    nth_value(expression, n ORDER BY expression)

#### Arguments

-   **expression**: The column or expression to retrieve the nth value
    from.

-   **n**: The position (nth) of the value to retrieve, based on the
    ordering.

### `regr_avgx`

Computes the average of the independent variable (input) expression_x
for the non-null paired data points.

    regr_avgx(expression_y, expression_x)

#### Arguments

-   **expression_y**: Dependent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

-   **expression_x**: Independent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `regr_avgy`

Computes the average of the dependent variable (output) expression_y for
the non-null paired data points.

    regr_avgy(expression_y, expression_x)

#### Arguments

-   **expression_y**: Dependent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

-   **expression_x**: Independent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `regr_count`

Counts the number of non-null paired data points.

    regr_count(expression_y, expression_x)

#### Arguments

-   **expression_y**: Dependent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

-   **expression_x**: Independent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `regr_intercept`

Computes the y-intercept of the linear regression line. For the equation
(y = kx + b), this function returns b.

    regr_intercept(expression_y, expression_x)

#### Arguments

-   **expression_y**: Dependent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

-   **expression_x**: Independent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `regr_r2`

Computes the square of the correlation coefficient between the
independent and dependent variables.

    regr_r2(expression_y, expression_x)

#### Arguments

-   **expression_y**: Dependent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

-   **expression_x**: Independent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `regr_slope`

Returns the slope of the linear regression line for non-null pairs in
aggregate columns. Given input column Y and X: regr_slope(Y, X) returns
the slope (k in Y = k*X + b) using minimal RSS fitting.

    regr_slope(expression_y, expression_x)

#### Arguments

-   **expression_y**: Dependent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

-   **expression_x**: Independent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `regr_sxx`

Computes the sum of squares of the independent variable.

    regr_sxx(expression_y, expression_x)

#### Arguments

-   **expression_y**: Dependent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

-   **expression_x**: Independent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `regr_sxy`

Computes the sum of products of paired data points.

    regr_sxy(expression_y, expression_x)

#### Arguments

-   **expression_y**: Dependent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

-   **expression_x**: Independent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `regr_syy`

Computes the sum of squares of the dependent variable.

    regr_syy(expression_y, expression_x)

#### Arguments

-   **expression_y**: Dependent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

-   **expression_x**: Independent variable expression to operate on. Can
    be a constant, column, or function, and any combination of
    operators.

### `stddev`

Returns the standard deviation of a set of numbers.

    stddev(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

#### Aliases

-   stddev_samp

### `stddev_pop`

Returns the population standard deviation of a set of numbers.

    stddev_pop(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `stddev_samp`

*Alias of [stddev](#stddev).*

## Approximate Functions

-   [approx_distinct](#approx-distinct)
-   [approx_median](#approx-median)
-   [approx_percentile_cont](#approx-percentile-cont)
-   [approx_percentile_cont_with_weight](#approx-percentile-cont-with-weight)

### `approx_distinct`

Returns the approximate number of distinct input values calculated using
the HyperLogLog algorithm.

    approx_distinct(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `approx_median`

Returns the approximate median (50th percentile) of input values. It is
an alias of
`approx_percentile_cont(0.5)`` ``WITHIN`` ``GROUP`` ``(ORDER`` ``BY`` ``x)`.

    approx_median(expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

### `approx_percentile_cont`

Returns the approximate percentile of input values using the t-digest
algorithm.

    approx_percentile_cont(percentile [, centroids]) WITHIN GROUP (ORDER BY expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **percentile**: Percentile to compute. Must be a float value between
    0 and 1 (inclusive).

-   **centroids**: Number of centroids to use in the t-digest algorithm.
    *Default is 100*. A higher number results in more accurate
    approximation but requires more memory.

### `approx_percentile_cont_with_weight`

Returns the weighted approximate percentile of input values using the
t-digest algorithm.

    approx_percentile_cont_with_weight(weight, percentile [, centroids]) WITHIN GROUP (ORDER BY expression)

#### Arguments

-   **expression**: The expression to operate on. Can be a constant,
    column, or function, and any combination of operators.

-   **weight**: Expression to use as weight. Can be a constant, column,
    or function, and any combination of arithmetic operators.

-   **percentile**: Percentile to compute. Must be a float value between
    0 and 1 (inclusive).

-   **centroids**: Number of centroids to use in the t-digest algorithm.
    *Default is 100*. A higher number results in more accurate
    approximation but requires more memory.

# Window Functions

A *window function* performs a calculation across a set of table rows
that are somehow related to the current row. This is comparable to the
type of calculation that can be done with an aggregate function.
However, window functions do not cause rows to become grouped into a
single output row like non-window aggregate calls would. Instead, the
rows retain their separate identities. Behind the scenes, the window
function is able to access more than just the current row of the query
result

Here is an example that shows how to compare each employee's salary with
the average salary in his or her department:

    SELECT depname, empno, salary, avg(salary) OVER (PARTITION BY depname) FROM empsalary;

A window function call always contains an OVER clause directly following
the window function's name and argument(s). This is what syntactically
distinguishes it from a normal function or non-window aggregate. The
OVER clause determines exactly how the rows of the query are split up
for processing by the window function. The PARTITION BY clause within
OVER divides the rows into groups, or partitions, that share the same
values of the PARTITION BY expression(s). For each row, the window
function is computed across the rows that fall into the same partition
as the current row. The previous example showed how to count the average
of a column per partition.

You can also control the order in which rows are processed by window
functions using ORDER BY within OVER. (The window ORDER BY does not even
have to match the order in which the rows are output.) Here is an
example:

    SELECT depname, empno, salary,
           rank() OVER (PARTITION BY depname ORDER BY salary DESC)
    FROM empsalary;

There is another important concept associated with window functions: for
each row, there is a set of rows within its partition called its window
frame. Some window functions act only on the rows of the window frame,
rather than of the whole partition. Here is an example of using window
frames in queries:

    SELECT depname, empno, salary,
        avg(salary) OVER(ORDER BY salary ASC ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS avg,
        min(salary) OVER(ORDER BY empno ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_min
    FROM empsalary
    ORDER BY empno ASC;

When a query involves multiple window functions, it is possible to write
out each one with a separate OVER clause, but this is duplicative and
error-prone if the same windowing behavior is wanted for several
functions. Instead, each windowing behavior can be named in a WINDOW
clause and then referenced in OVER. For example:

    SELECT sum(salary) OVER w, avg(salary) OVER w
    FROM empsalary
    WINDOW w AS (PARTITION BY depname ORDER BY salary DESC);

## Syntax

The syntax for the OVER-clause is

    function([expr])
      OVER(
        [PARTITION BY expr[, …]]
        [ORDER BY expr [ ASC | DESC ][, …]]
        [ frame_clause ]
        )

where **frame_clause** is one of:

      { RANGE | ROWS | GROUPS } frame_start
      { RANGE | ROWS | GROUPS } BETWEEN frame_start AND frame_end

and **frame_start** and **frame_end** can be one of

    UNBOUNDED PRECEDING
    offset PRECEDING
    CURRENT ROW
    offset FOLLOWING
    UNBOUNDED FOLLOWING

where **offset** is an non-negative integer.

RANGE and GROUPS modes require an ORDER BY clause (with RANGE the ORDER
BY must specify exactly one column).

## Aggregate functions

All [aggregate functions](aggregate_functions.html) can be used as
window functions.

## Ranking Functions

-   [cume_dist](#cume-dist)
-   [dense_rank](#dense-rank)
-   [ntile](#ntile)
-   [percent_rank](#percent-rank)
-   [rank](#rank)
-   [row_number](#row-number)

### `cume_dist`

Relative rank of the current row: (number of rows preceding or peer with
the current row) / (total rows).

    cume_dist()

#### Example

    -- Example usage of the cume_dist window function:
    SELECT salary,
        cume_dist() OVER (ORDER BY salary) AS cume_dist
    FROM employees;

### `dense_rank`

Returns the rank of the current row without gaps. This function ranks
rows in a dense manner, meaning consecutive ranks are assigned even for
identical values.

    dense_rank()

#### Example

    -- Example usage of the dense_rank window function:
    SELECT department,
        salary,
        dense_rank() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank
    FROM employees;

### `ntile`

Integer ranging from 1 to the argument value, dividing the partition as
equally as possible

    ntile(expression)

#### Arguments

-   **expression**: An integer describing the number groups the
    partition should be split into

### `percent_rank`

Returns the percentage rank of the current row within its partition. The
value ranges from 0 to 1 and is computed as
`(rank`` ``-`` ``1)`` ``/`` ``(total_rows`` ``-`` ``1)`.

    percent_rank()

#### Example

        -- Example usage of the percent_rank window function:
    SELECT employee_id,
        salary,
        percent_rank() OVER (ORDER BY salary) AS percent_rank
    FROM employees;

### `rank`

Returns the rank of the current row within its partition, allowing gaps
between ranks. This function provides a ranking similar to `row_number`,
but skips ranks for identical values.

    rank()

#### Example

    -- Example usage of the rank window function:
    SELECT department,
        salary,
        rank() OVER (PARTITION BY department ORDER BY salary DESC) AS rank
    FROM employees;

### `row_number`

Number of the current row within its partition, counting from 1.

    row_number()

#### Example

    -- Example usage of the row_number window function:
    SELECT department,
      salary,
      row_number() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num
    FROM employees;

## Analytical Functions

-   [first_value](#first-value)
-   [lag](#lag)
-   [last_value](#last-value)
-   [lead](#lead)
-   [nth_value](#nth-value)

### `first_value`

Returns value evaluated at the row that is the first row of the window
frame.

    first_value(expression)

#### Arguments

-   **expression**: Expression to operate on

### `lag`

Returns value evaluated at the row that is offset rows before the
current row within the partition; if there is no such row, instead
return default (which must be of the same type as value).

    lag(expression, offset, default)

#### Arguments

-   **expression**: Expression to operate on

-   **offset**: Integer. Specifies how many rows back the value of
    expression should be retrieved. Defaults to 1.

-   **default**: The default value if the offset is not within the
    partition. Must be of the same type as expression.

### `last_value`

Returns value evaluated at the row that is the last row of the window
frame.

    last_value(expression)

#### Arguments

-   **expression**: Expression to operate on

### `lead`

Returns value evaluated at the row that is offset rows after the current
row within the partition; if there is no such row, instead return
default (which must be of the same type as value).

    lead(expression, offset, default)

#### Arguments

-   **expression**: Expression to operate on

-   **offset**: Integer. Specifies how many rows forward the value of
    expression should be retrieved. Defaults to 1.

-   **default**: The default value if the offset is not within the
    partition. Must be of the same type as expression.

### `nth_value`

Returns the value evaluated at the nth row of the window frame (counting
from 1). Returns NULL if no such row exists.

    nth_value(expression, n)

#### Arguments

-   **expression**: The column from which to retrieve the nth value.

-   **n**: Integer. Specifies the row number (starting from 1) in the
    window frame.
